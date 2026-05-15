import type { UUID } from "crypto"
import { Exceptions } from "@/libs"
import { FileStorageService } from "./FileStorageService"

export class ChatService {
  private readonly fileStorage: FileStorageService

  constructor(private readonly models: iDatabase.Models) {
    this.fileStorage = new FileStorageService(models.StoredFile)
  }

  listRooms(userUid: UUID): Promise<iSharedChat.ChatRoomsListResponseDto> {
    return this.models.ChatRoom.findAll({
      include: [
        {
          association: this.models.ChatRoom.associations.members,
          required: false,
          where: { userUid }
        }
      ],
      order: [["createdAt", "ASC"]]
    })
      .then((rooms) => ({
        rooms: rooms
          .filter((room) => room.type === "public" || room.members.length > 0)
          .map((room) => this.toRoomDto(room))
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
      title: payload.title.trim(),
      createdByUserUid: userUid
    })
      .then((room) => this.createRoomMembers(room.uid, userUid, payload.memberUserUids)
        .then(() => ({
          room: this.toRoomDto(room)
        })))
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
        if (room.type === "public") return undefined

        return this.models.ChatRoomMember.findOne({
          where: {
            roomUid,
            userUid
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

    if (!payload.title.trim().length) {
      throw new Exceptions.ServiceError.ConflictError("Название чата обязательно")
    }

    if (payload.type === "private" && payload.memberUserUids.length !== 1) {
      throw new Exceptions.ServiceError.ConflictError("Приватный чат должен содержать одного собеседника")
    }
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
      title: room.title,
      createdAt: room.createdAt.toISOString()
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
        url: metadata.url
      }
    } catch (error) {
      throw new Exceptions.ServiceError.InternalError("Не удалось прочитать metadata файла", { cause: error })
    }
  }
}
