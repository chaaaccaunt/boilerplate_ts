import type { UUID } from "crypto"
import { Exceptions } from "@/libs"
import { FileStorageService } from "./FileStorageService"

export class ChatService {
  private readonly fileStorage: FileStorageService

  constructor(
    private readonly models: iDatabase.Models,
    private readonly databaseTools: iLibs.DatabaseServiceTools
  ) {
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
          .map((room) => this.toRoomDto(room, userUid))
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
        messages: messages.map((message) => this.toMessageDto(message, userUid))
      }))
  }

  createRoom(userUid: UUID, payload: iSharedChat.ChatRoomCreatePayloadDto, requestId?: string): Promise<iSharedChat.ChatRoomCreateResponseDto> {
    const memberUserUids = this.getPayloadMemberUserUids(userUid, payload.memberUserUids)
    const roomType: iSharedChat.ChatRoomType = memberUserUids.length === 1 ? "private" : "group"

    return this.models.ChatRoom.create({
      type: roomType,
      status: "active",
      title: roomType === "private" ? "Приватный чат" : "Новая группа",
      createdByUserUid: userUid
    }, {
      logging: this.createMutationQueryLogger("createRoom", "chat_rooms insert query", requestId)
    })
      .then((room) => this.createRoomMembers(room.uid, userUid, memberUserUids, requestId)
        .then(() => this.findActiveRoomWithMembers(room.uid))
        .then((createdRoom) => ({
          room: this.toRoomDto(createdRoom, userUid)
        })))
  }

  updateRoom(userUid: UUID, payload: iSharedChat.ChatRoomUpdatePayloadDto, requestId?: string): Promise<iSharedChat.ChatRoomUpdateResponseDto> {
    return this.findActiveRoom(payload.roomUid)
      .then((room) => {
        this.assertGroupRoomOwner(room, userUid)
        this.assertValidRoomTitle(payload.title)

        return room.update({
          title: payload.title.trim()
        }, {
          logging: this.createMutationQueryLogger("updateRoom", "chat_rooms update query", requestId)
        })
          .then((updatedRoom) => this.replaceRoomMembers(updatedRoom.uid, userUid, payload.memberUserUids, requestId)
            .then(() => this.findActiveRoomWithMembers(updatedRoom.uid)))
      })
      .then((room) => ({
        room: this.toRoomDto(room, userUid)
      }))
  }

  deleteRoom(userUid: UUID, payload: iSharedChat.ChatRoomDeletePayloadDto, requestId?: string): Promise<iSharedChat.ChatRoomDeleteResponseDto> {
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
          },
          logging: this.createMutationQueryLogger("deleteRoom", "chat_room_members update query", requestId)
        })
          .then(() => room.update({
            status: "archived_by_owner",
            createdByUserUid: null,
            archivedAt
          }, {
            logging: this.createMutationQueryLogger("deleteRoom", "chat_rooms update query", requestId)
          }))
      })
      .then(() => ({
        roomUid: payload.roomUid
      }))
  }

  leaveRoom(userUid: UUID, payload: iSharedChat.ChatRoomLeavePayloadDto, requestId?: string): Promise<iSharedChat.ChatRoomLeaveResponseDto> {
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

            return member.update({ leftAt: new Date() }, {
              logging: this.createMutationQueryLogger("leaveRoom", "chat_room_members update query", requestId)
            })
              .then(() => room)
          })
      })
      .then((room) => room.type === "private"
        ? this.archivePrivateRoomIfEmpty(room, requestId)
        : undefined)
      .then(() => ({
        roomUid: payload.roomUid,
        closedForUser: true
      }))
  }

  sendMessage(userUid: UUID, payload: iSharedChat.ChatMessageSendPayloadDto, requestId?: string): Promise<iSharedChat.ChatMessageSendResponseDto> {
    return this.assertRoomAccess(userUid, payload.roomUid)
      .then(() => {
        this.assertValidMessagePayload(payload)

        return this.models.ChatMessage.create({
          roomUid: payload.roomUid as UUID,
          senderUserUid: userUid,
          text: payload.text?.trim() || null
        }, {
          logging: this.createMutationQueryLogger("sendMessage", "chat_messages insert query", requestId)
        })
      })
      .then((message) => this.createMessageFiles(message.uid, userUid, payload.files, requestId)
        .then(() => message))
      .then((message) => this.findCreatedMessage(message.uid))
      .then((createdMessage) => ({
        message: this.toMessageDto(createdMessage, userUid)
      }))
  }

  updateMessage(userUid: UUID, payload: iSharedChat.ChatMessageUpdatePayloadDto, requestId?: string): Promise<iSharedChat.ChatMessageUpdateResponseDto> {
    return this.findMessageForUserAction(userUid, payload.messageUid)
      .then((message) => {
        this.assertValidMessagePayload({
          roomUid: message.roomUid,
          text: payload.text,
          files: payload.files
        })

        return message.update({
          text: payload.text?.trim() || null
        }, {
          logging: this.createMutationQueryLogger("updateMessage", "chat_messages update query", requestId)
        })
          .then(() => this.replaceMessageFiles(message.uid, userUid, payload.files, requestId))
          .then(() => this.findCreatedMessage(message.uid))
      })
      .then((message) => ({
        message: this.toMessageDto(message, userUid)
      }))
  }

  deleteMessage(userUid: UUID, payload: iSharedChat.ChatMessageDeletePayloadDto, requestId?: string): Promise<iSharedChat.ChatMessageDeleteResponseDto> {
    return this.findMessageForUserAction(userUid, payload.messageUid)
      .then((message) => this.models.ChatMessageFile.destroy({
        where: { messageUid: message.uid },
        logging: this.createMutationQueryLogger("deleteMessage", "chat_message_files delete query", requestId)
      })
        .then(() => message.destroy({
          logging: this.createMutationQueryLogger("deleteMessage", "chat_messages delete query", requestId)
        }))
        .then(() => ({
          messageUid: message.uid,
          roomUid: message.roomUid
        })))
  }

  deleteMessageFile(userUid: UUID, payload: iSharedChat.ChatMessageFileDeletePayloadDto, requestId?: string): Promise<iSharedChat.ChatMessageFileDeleteResponseDto> {
    return this.findMessageForUserAction(userUid, payload.messageUid)
      .then((message) => this.models.ChatMessageFile.findOne({
        where: {
          messageUid: message.uid,
          storedFileUid: payload.fileUid
        }
      })
        .then((messageFile) => {
          if (!messageFile) throw new Exceptions.ServiceError.NotFoundError("Вложение не найдено")
          const hasText = Boolean(message.text?.trim())

          if (!hasText && message.files.length <= 1) {
            throw new Exceptions.ServiceError.ConflictError("Сообщение должно содержать текст или файл")
          }

          return messageFile.destroy({
            logging: this.createMutationQueryLogger("deleteMessageFile", "chat_message_files delete query", requestId)
          })
            .then(() => this.findCreatedMessage(message.uid))
        }))
      .then((message) => ({
        message: this.toMessageDto(message, userUid),
        fileUid: payload.fileUid
      }))
  }

  private createRoomMembers(roomUid: UUID, userUid: UUID, roomMemberUserUids: UUID[], requestId?: string): Promise<void> {
    const memberUserUids = [userUid, ...roomMemberUserUids]

    return this.models.ChatRoomMember.bulkCreate(memberUserUids.map((memberUserUid) => ({
      roomUid,
      userUid: memberUserUid
    })), {
      logging: this.createMutationQueryLogger("createRoomMembers", "chat_room_members insert query", requestId)
    })
      .then(() => undefined)
  }

  private replaceRoomMembers(roomUid: UUID, ownerUserUid: UUID, payloadMemberUserUids: string[], requestId?: string): Promise<void> {
    const memberUserUids = Array.from(new Set([ownerUserUid, ...payloadMemberUserUids.map((memberUserUid) => memberUserUid as UUID)]))

    return this.models.ChatRoomMember.findAll({ where: { roomUid } })
      .then((members) => members.reduce<Promise<void>>((previous, member) => previous
        .then(() => member.update({
          leftAt: memberUserUids.includes(member.userUid) ? null : new Date()
        }, {
          logging: this.createMutationQueryLogger("replaceRoomMembers", "chat_room_members update query", requestId)
        }))
        .then(() => undefined), Promise.resolve())
        .then(() => {
          const existingMemberUserUids = members.map((member) => member.userUid)
          const missingMemberUserUids = memberUserUids.filter((memberUserUid) => !existingMemberUserUids.includes(memberUserUid))

          if (!missingMemberUserUids.length) return undefined

          return this.models.ChatRoomMember.bulkCreate(missingMemberUserUids.map((memberUserUid) => ({
            roomUid,
            userUid: memberUserUid
          })), {
            logging: this.createMutationQueryLogger("replaceRoomMembers", "chat_room_members insert query", requestId)
          })
            .then(() => undefined)
        }))
  }

  private createMessageFiles(messageUid: UUID, userUid: UUID, files?: iSharedChat.ChatFilePayloadDto[], requestId?: string): Promise<void> {
    if (!files?.length) return Promise.resolve()

    return this.assertMessageFilesOwnedByUser(files, userUid)
      .then(() => this.models.ChatMessageFile.bulkCreate(files.map((file) => ({
        messageUid,
        storedFileUid: file.fileUid as UUID
      })), {
        logging: this.createMutationQueryLogger("createMessageFiles", "chat_message_files insert query", requestId)
      }))
      .then(() => undefined)
  }

  private replaceMessageFiles(messageUid: UUID, userUid: UUID, files?: iSharedChat.ChatFilePayloadDto[], requestId?: string): Promise<void> {
    return Promise.resolve(files?.length ? this.assertMessageFilesOwnedByUser(files, userUid) : undefined)
      .then(() => this.models.ChatMessageFile.destroy({
        where: { messageUid },
        logging: this.createMutationQueryLogger("replaceMessageFiles", "chat_message_files delete query", requestId)
      }))
      .then(() => this.createMessageFiles(messageUid, userUid, files, requestId))
  }

  private assertMessageFilesOwnedByUser(files: iSharedChat.ChatFilePayloadDto[], userUid: UUID): Promise<void> {
    const uniqueFileUids = Array.from(new Set(files.map((file) => file.fileUid)))

    return Promise.all(uniqueFileUids.map((fileUid) => this.fileStorage.findOwned(fileUid, userUid)))
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

  private getPayloadMemberUserUids(userUid: UUID, payloadMemberUserUids: string[]): UUID[] {
    const memberUserUids = Array.from(new Set(payloadMemberUserUids.map((memberUserUid) => memberUserUid as UUID)))
      .filter((memberUserUid) => memberUserUid !== userUid)

    if (!memberUserUids.length) {
      throw new Exceptions.ServiceError.ConflictError("Выберите хотя бы одного участника")
    }

    return memberUserUids
  }

  private findMessageForUserAction(userUid: UUID, messageUid: string): Promise<iDatabase.Models["ChatMessage"]["prototype"]> {
    return this.models.ChatMessage.findByPk(messageUid, {
      include: [
        { association: this.models.ChatMessage.associations.sender },
        {
          association: this.models.ChatMessage.associations.files,
          include: [{ association: this.models.ChatMessageFile.associations.storedFile }]
        }
      ]
    })
      .then((message) => {
        if (!message) throw new Exceptions.ServiceError.NotFoundError("Сообщение не найдено")
        if (message.senderUserUid !== userUid) {
          throw new Exceptions.ServiceError.AuthenticationError("Нет доступа к сообщению")
        }

        return this.assertRoomAccess(userUid, message.roomUid)
          .then(() => message)
      })
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
      },
      include: [{ association: this.models.ChatRoomMember.associations.user }]
    }
  }

  private hasActiveMember(room: iDatabase.Models["ChatRoom"]["prototype"], userUid: UUID): boolean {
    return room.members.some((member) => member.userUid === userUid && !member.leftAt)
  }

  private archivePrivateRoomIfEmpty(room: iDatabase.Models["ChatRoom"]["prototype"], requestId?: string): Promise<void> {
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
          createdByUserUid: null,
          archivedAt: new Date()
        }, {
          logging: this.createMutationQueryLogger("archivePrivateRoomIfEmpty", "chat_rooms update query", requestId)
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

  private toRoomDto(room: iDatabase.Models["ChatRoom"]["prototype"], viewerUserUid: UUID | null): iSharedChat.ChatRoomDto {
    return {
      uid: room.uid,
      type: room.type,
      status: room.status,
      title: this.getRoomTitle(room, viewerUserUid),
      createdByUserUid: room.createdByUserUid,
      memberUserUids: room.members?.filter((member) => !member.leftAt).map((member) => member.userUid) || [],
      createdAt: room.createdAt.toISOString()
    }
  }

  private getRoomTitle(room: iDatabase.Models["ChatRoom"]["prototype"], viewerUserUid: UUID | null): string {
    if (room.type !== "private" || !viewerUserUid) return room.title

    const companion = room.members?.find((member) => member.userUid !== viewerUserUid && !member.leftAt)
    return companion?.user?.fullName || room.title
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

  private toMessageDto(message: iDatabase.Models["ChatMessage"]["prototype"], viewerUserUid: UUID | null): iSharedChat.ChatMessageDto {
    return {
      uid: message.uid,
      roomUid: message.roomUid,
      sender: {
        firstName: message.sender.firstName,
        lastName: message.sender.lastName
      },
      isOwn: Boolean(viewerUserUid && message.senderUserUid === viewerUserUid),
      text: message.text,
      files: message.files.map((file) => this.toFileDto(file)),
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString()
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

  private createMutationQueryLogger(serviceMethod: string, event: string, requestId?: string): (sql: string) => void {
    return this.databaseTools.createDatabaseQueryLogger({
      requestId,
      serviceName: this.constructor.name,
      serviceMethod,
      event,
      mutation: true
    })
  }
}
