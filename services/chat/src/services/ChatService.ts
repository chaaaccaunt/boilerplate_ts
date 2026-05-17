import type { UUID } from "crypto"
import { Exceptions } from "@/libs"
import { FileStorageService } from "./FileStorageService"

export class ChatService {
  private readonly systemUserUid = "00000000-0000-4000-8000-000000000202"
  private readonly fileStorage: FileStorageService

  constructor(private readonly models: iDatabase.Models) {
    this.fileStorage = new FileStorageService(models.StoredFile)
  }

  listRooms(userUid: UUID): Promise<iSharedChat.ChatRoomsListResponseDto> {
    return this.models.ChatRoom.findAll({
      where: { status: "active" },
      include: [this.getRoomMembersInclude()],
      order: [["createdAt", "ASC"]]
    })
      .then((rooms) => ({
        rooms: rooms
          .filter((room) => room.type === "public" || this.hasActiveMember(room, userUid))
          .map((room) => this.toRoomDto(room))
      }))
  }

  listAvailableMembers(): Promise<iSharedChat.ChatAvailableMembersListResponseDto> {
    return this.models.User.findAll({
      include: [{
        association: this.models.User.associations.roles,
        include: [{ association: this.models.UserRole.associations.role }]
      }],
      order: [["lastName", "ASC"], ["firstName", "ASC"]]
    })
      .then((users) => ({
        users: users.map((user) => this.toPublicUserDto(user))
      }))
  }

  listClosedRooms(): Promise<iSharedChat.ChatClosedRoomsListResponseDto> {
    return this.models.ChatRoom.findAll({
      where: {
        status: ["archived_by_owner", "orphaned"]
      },
      include: [this.getRoomMembersInclude()],
      order: [["updatedAt", "DESC"]]
    })
      .then((rooms) => ({
        rooms: rooms.map((room) => this.toRoomDto(room))
      }))
  }

  listMessages(userUid: UUID, payload: iSharedChat.ChatMessagesListPayloadDto): Promise<iSharedChat.ChatMessagesListResponseDto> {
    return this.assertRoomAccess(userUid, payload.roomUid)
      .then(() => this.models.ChatMessage.findAll({
        where: { roomUid: payload.roomUid },
        include: [
          { association: this.models.ChatMessage.associations.sender },
          {
            association: this.models.ChatMessage.associations.files,
            include: [{ association: this.models.ChatMessageFile.associations.storedFile }]
          }
        ],
        order: [["createdAt", "ASC"]],
        limit: 100
      }))
      .then((messages) => ({
        messages: messages.map((message) => this.toMessageDto(message))
      }))
  }

  createRoom(userUid: UUID, payload: iSharedChat.ChatRoomCreatePayloadDto): Promise<iSharedChat.ChatRoomCreateResponseDto> {
    this.assertValidRoomPayload(payload)

    return this.models.ChatRoom.create({
      type: payload.type,
      status: "active",
      title: payload.title.trim(),
      createdByUserUid: userUid
    })
      .then((room) => this.createRoomMembers(room.uid, userUid, payload.memberUserUids)
        .then(() => this.findActiveRoomWithMembers(room.uid))
        .then((createdRoom) => ({
          room: this.toRoomDto(createdRoom)
        })))
  }

  updateRoom(userUid: UUID, payload: iSharedChat.ChatRoomUpdatePayloadDto): Promise<iSharedChat.ChatRoomUpdateResponseDto> {
    return this.findActiveRoom(payload.roomUid)
      .then((room) => {
        this.assertGroupRoomOwner(room, userUid)
        this.assertValidRoomTitle(payload.title)

        return room.update({
          title: payload.title.trim()
        })
          .then((updatedRoom) => this.replaceRoomMembers(updatedRoom.uid, userUid, payload.memberUserUids)
            .then(() => this.findActiveRoomWithMembers(updatedRoom.uid)))
      })
      .then((room) => ({
        room: this.toRoomDto(room)
      }))
  }

  listRoomMessagesAsAdministrator(payload: iSharedChat.ChatAdminMessagesListPayloadDto): Promise<iSharedChat.ChatMessagesListResponseDto> {
    return this.models.ChatRoom.findByPk(payload.roomUid)
      .then((room) => {
        if (!room) throw new Exceptions.ServiceError.NotFoundError("Чат не найден")

        return this.models.ChatMessage.findAll({
          where: { roomUid: payload.roomUid },
          include: [
            { association: this.models.ChatMessage.associations.sender },
            {
              association: this.models.ChatMessage.associations.files,
              include: [{ association: this.models.ChatMessageFile.associations.storedFile }]
            }
          ],
          order: [["createdAt", "ASC"]],
          limit: 500
        })
      })
      .then((messages) => ({
        messages: messages.map((message) => this.toMessageDto(message))
      }))
  }

  hardDeleteRoomAsAdministrator(payload: iSharedChat.ChatAdminHardDeleteRoomPayloadDto): Promise<iSharedChat.ChatAdminHardDeleteRoomResponseDto> {
    return this.models.ChatRoom.findByPk(payload.roomUid, { paranoid: false })
      .then((room) => {
        if (!room) throw new Exceptions.ServiceError.NotFoundError("Чат не найден")
        if (room.type === "public") {
          throw new Exceptions.ServiceError.ConflictError("Публичный чат нельзя удалить")
        }

        return this.models.ChatMessage.findAll({
          where: { roomUid: payload.roomUid },
          paranoid: false
        })
          .then((messages) => {
            const messageUids = messages.map((message) => message.uid)

            return this.models.ChatMessageFile.destroy({
              where: { messageUid: messageUids },
              force: true
            })
              .then(() => this.models.ChatMessage.destroy({
                where: { roomUid: payload.roomUid },
                force: true
              }))
              .then(() => this.models.ChatRoomMember.destroy({
                where: { roomUid: payload.roomUid },
                force: true
              }))
              .then(() => this.models.ChatRoom.destroy({
                where: { uid: payload.roomUid },
                force: true
              }))
          })
      })
      .then(() => ({
        roomUid: payload.roomUid
      }))
  }

  deleteRoom(userUid: UUID, payload: iSharedChat.ChatRoomDeletePayloadDto): Promise<iSharedChat.ChatRoomDeleteResponseDto> {
    return this.findActiveRoom(payload.roomUid)
      .then((room) => {
        this.assertGroupRoomOwner(room, userUid)

        const archivedAt = new Date()

        return this.models.ChatRoomMember.update({
          leftAt: archivedAt
        }, {
          where: {
            roomUid: room.uid,
            leftAt: null
          }
        })
          .then(() => room.update({
            status: "archived_by_owner",
            createdByUserUid: this.systemUserUid as UUID,
            archivedAt
          }))
      })
      .then(() => ({
        roomUid: payload.roomUid
      }))
  }

  leaveRoom(userUid: UUID, payload: iSharedChat.ChatRoomLeavePayloadDto): Promise<iSharedChat.ChatRoomLeaveResponseDto> {
    return this.findActiveRoom(payload.roomUid)
      .then((room) => {
        if (room.type === "public") {
          throw new Exceptions.ServiceError.ConflictError("Нельзя покинуть публичный чат")
        }

        if (room.type === "group" && room.createdByUserUid === userUid) {
          throw new Exceptions.ServiceError.ConflictError("Владелец групповой комнаты должен удалить комнату")
        }

        return this.models.ChatRoomMember.findOne({
          where: {
            roomUid: room.uid,
            userUid,
            leftAt: null
          }
        })
          .then((member) => {
            if (!member) throw new Exceptions.ServiceError.AuthenticationError("Нет доступа к чату")

            return member.update({ leftAt: new Date() })
              .then(() => room)
          })
      })
      .then((room) => room.type === "private"
        ? this.archivePrivateRoomIfEmpty(room)
        : undefined)
      .then(() => ({
        roomUid: payload.roomUid,
        closedForUser: true
      }))
  }

  sendMessage(userUid: UUID, payload: iSharedChat.ChatMessageSendPayloadDto): Promise<iSharedChat.ChatMessageSendResponseDto> {
    return this.assertRoomAccess(userUid, payload.roomUid)
      .then(() => {
        this.assertValidMessagePayload(payload)

        return this.models.ChatMessage.create({
          roomUid: payload.roomUid as UUID,
          senderUserUid: userUid,
          text: payload.text?.trim() || null
        })
      })
      .then((message) => this.createMessageFiles(message.uid, payload.files)
        .then(() => message))
      .then((message) => this.findCreatedMessage(message.uid))
      .then((createdMessage) => ({
        message: this.toMessageDto(createdMessage)
      }))
  }

  private createRoomMembers(roomUid: UUID, userUid: UUID, payloadMemberUserUids: string[]): Promise<void> {
    const memberUserUids = Array.from(new Set([userUid, ...payloadMemberUserUids.map((memberUserUid) => memberUserUid as UUID)]))

    return this.models.ChatRoomMember.bulkCreate(memberUserUids.map((memberUserUid) => ({
      roomUid,
      userUid: memberUserUid
    })))
      .then(() => undefined)
  }

  private replaceRoomMembers(roomUid: UUID, ownerUserUid: UUID, payloadMemberUserUids: string[]): Promise<void> {
    const memberUserUids = Array.from(new Set([ownerUserUid, ...payloadMemberUserUids.map((memberUserUid) => memberUserUid as UUID)]))

    return this.models.ChatRoomMember.findAll({ where: { roomUid } })
      .then((members) => members.reduce<Promise<void>>((previous, member) => previous
        .then(() => member.update({
          leftAt: memberUserUids.includes(member.userUid) ? null : new Date()
        }))
        .then(() => undefined), Promise.resolve())
        .then(() => {
          const existingMemberUserUids = members.map((member) => member.userUid)
          const missingMemberUserUids = memberUserUids.filter((memberUserUid) => !existingMemberUserUids.includes(memberUserUid))

          if (!missingMemberUserUids.length) return undefined

          return this.models.ChatRoomMember.bulkCreate(missingMemberUserUids.map((memberUserUid) => ({
            roomUid,
            userUid: memberUserUid
          })))
            .then(() => undefined)
        }))
  }

  private createMessageFiles(messageUid: UUID, files?: iSharedChat.ChatFilePayloadDto[]): Promise<void> {
    if (!files?.length) return Promise.resolve()

    return this.models.ChatMessageFile.bulkCreate(files.map((file) => ({
      messageUid,
      storedFileUid: file.fileUid as UUID
    })))
      .then(() => undefined)
  }

  private findCreatedMessage(messageUid: UUID): Promise<iDatabase.Models["ChatMessage"]["prototype"]> {
    return this.models.ChatMessage.findByPk(messageUid, {
      include: [
        { association: this.models.ChatMessage.associations.sender },
        {
          association: this.models.ChatMessage.associations.files,
          include: [{ association: this.models.ChatMessageFile.associations.storedFile }]
        }
      ]
    })
      .then((createdMessage) => {
        if (!createdMessage) {
          throw new Exceptions.ServiceError.InternalError("Не удалось создать сообщение")
        }

        return createdMessage
      })
  }

  assertRoomAccess(userUid: UUID, roomUid: string): Promise<void> {
    return this.models.ChatRoom.findByPk(roomUid)
      .then((room) => {
        if (!room) throw new Exceptions.ServiceError.NotFoundError("Чат не найден")
        if (room.status !== "active") throw new Exceptions.ServiceError.NotFoundError("Чат не найден")
        if (room.type === "public") return undefined

        return this.models.ChatRoomMember.findOne({
          where: {
            roomUid,
            userUid,
            leftAt: null
          }
        })
          .then((member) => {
            if (!member) {
              throw new Exceptions.ServiceError.AuthenticationError("Нет доступа к чату")
            }
          })
      })
  }

  private assertValidRoomPayload(payload: iSharedChat.ChatRoomCreatePayloadDto): void {
    if (payload.type === "public") {
      throw new Exceptions.ServiceError.ConflictError("Публичный чат создается системой")
    }

    this.assertValidRoomTitle(payload.title)

    if (payload.type === "private" && payload.memberUserUids.length !== 1) {
      throw new Exceptions.ServiceError.ConflictError("Приватный чат должен содержать одного собеседника")
    }
  }

  private assertValidRoomTitle(title: string): void {
    if (!title.trim().length) {
      throw new Exceptions.ServiceError.ConflictError("Название чата обязательно")
    }
  }

  private assertGroupRoomOwner(room: iDatabase.Models["ChatRoom"]["prototype"], userUid: UUID): void {
    if (room.type !== "group") {
      throw new Exceptions.ServiceError.ConflictError("Изменять или удалять можно только групповые комнаты")
    }

    if (room.createdByUserUid !== userUid) {
      throw new Exceptions.ServiceError.AuthenticationError("Нет доступа к управлению комнатой")
    }
  }

  private findActiveRoom(roomUid: string): Promise<iDatabase.Models["ChatRoom"]["prototype"]> {
    return this.models.ChatRoom.findOne({
      where: {
        uid: roomUid,
        status: "active"
      }
    })
      .then((room) => {
        if (!room) {
          throw new Exceptions.ServiceError.NotFoundError("Чат не найден")
        }

        return room
      })
  }

  private findActiveRoomWithMembers(roomUid: string): Promise<iDatabase.Models["ChatRoom"]["prototype"]> {
    return this.models.ChatRoom.findOne({
      where: {
        uid: roomUid,
        status: "active"
      },
      include: [this.getRoomMembersInclude()]
    })
      .then((room) => {
        if (!room) {
          throw new Exceptions.ServiceError.NotFoundError("Чат не найден")
        }

        return room
      })
  }

  private getRoomMembersInclude() {
    return {
      association: this.models.ChatRoom.associations.members,
      required: false,
      where: {
        leftAt: null
      }
    }
  }

  private hasActiveMember(room: iDatabase.Models["ChatRoom"]["prototype"], userUid: UUID): boolean {
    return room.members.some((member) => member.userUid === userUid && !member.leftAt)
  }

  private archivePrivateRoomIfEmpty(room: iDatabase.Models["ChatRoom"]["prototype"]): Promise<void> {
    return this.models.ChatRoomMember.count({
      where: {
        roomUid: room.uid,
        leftAt: null
      }
    })
      .then((activeMembersCount) => {
        if (activeMembersCount > 0) return undefined

        return room.update({
          status: "orphaned",
          createdByUserUid: this.systemUserUid as UUID,
          archivedAt: new Date()
        })
          .then(() => undefined)
      })
  }

  private assertValidMessagePayload(payload: iSharedChat.ChatMessageSendPayloadDto): void {
    const hasText = Boolean(payload.text?.trim().length)
    const hasFiles = Boolean(payload.files?.length)

    if (!hasText && !hasFiles) {
      throw new Exceptions.ServiceError.ConflictError("Сообщение должно содержать текст или файл")
    }
  }

  private toRoomDto(room: iDatabase.Models["ChatRoom"]["prototype"]): iSharedChat.ChatRoomDto {
    return {
      uid: room.uid,
      type: room.type,
      status: room.status,
      title: room.title,
      createdByUserUid: room.createdByUserUid,
      memberUserUids: room.members?.filter((member) => !member.leftAt).map((member) => member.userUid) || [],
      createdAt: room.createdAt.toISOString()
    }
  }

  private toPublicUserDto(user: iDatabase.Models["User"]["prototype"]): iSharedUser.PublicUserDto {
    return {
      uid: user.uid,
      login: user.login,
      firstName: user.firstName,
      lastName: user.lastName,
      surname: user.surname,
      fullName: user.fullName,
      roles: user.roles.map((userRole) => ({
        uid: userRole.role.uid,
        name: userRole.role.name
      }))
    }
  }

  private toMessageDto(message: iDatabase.Models["ChatMessage"]["prototype"]): iSharedChat.ChatMessageDto {
    return {
      uid: message.uid,
      roomUid: message.roomUid,
      sender: {
        firstName: message.sender.firstName,
        lastName: message.sender.lastName
      },
      text: message.text,
      files: message.files.map((file) => this.toFileDto(file)),
      createdAt: message.createdAt.toISOString()
    }
  }

  private toFileDto(file: iDatabase.Models["ChatMessageFile"]["prototype"]): iSharedChat.ChatFileDto {
    try {
      const metadata = this.fileStorage.toUploadedFileDto(file.storedFile)

      return {
        uid: file.uid,
        fileUid: metadata.fileUid,
        originalName: metadata.originalName,
        mimeType: metadata.mimeType,
        size: metadata.size,
        description: metadata.description,
        url: metadata.url,
        viewUrl: metadata.viewUrl,
        previewUrl: metadata.previewUrl
      }
    } catch (error) {
      throw new Exceptions.ServiceError.InternalError("Не удалось прочитать metadata файла", { cause: error })
    }
  }
}
