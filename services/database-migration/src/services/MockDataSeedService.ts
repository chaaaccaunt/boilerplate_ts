import { createHash } from "crypto"
import { QueryInterface, Sequelize, Transaction } from "sequelize"

const mockUserCount = 500
const mockRoleCount = 20
const mockChatRoomCount = 1000
const mockMessageCount = 50000
const batchSize = 1000
const developmentPasswordHash = "$2b$10$9Srrg0qhRsHjC5YFbw8wYukfownKqxKgtF48VDErFBeXBpTfR9ixK"

interface MockUser {
  uid: string
}

interface MockRoom {
  uid: string
  memberUids: string[]
}

export class MockDataSeedService {
  constructor(private readonly sequelize: Sequelize) { }

  seed(): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Генерация mock-данных запрещена в production-среде")
    }

    return this.sequelize.transaction((transaction) => this.insertMockData(transaction))
  }

  private async insertMockData(transaction: Transaction): Promise<void> {
    const queryInterface = this.sequelize.getQueryInterface()
    const now = new Date()
    const users = this.createUsers(now)
    const roles = this.createRoles(now)
    const rooms = this.createRooms(users, now)

    await this.bulkInsert(queryInterface, "roles", roles, transaction)
    await this.bulkInsert(queryInterface, "users", users, transaction)
    await this.bulkInsert(queryInterface, "user_roles", this.createUserRoles(users, roles, now), transaction)
    await this.bulkInsert(queryInterface, "chat_rooms", rooms.map(({ memberUids, ...room }) => room), transaction)
    await this.bulkInsert(queryInterface, "chat_room_members", this.createRoomMembers(rooms, now), transaction)
    await this.bulkInsert(queryInterface, "chat_messages", this.createMessages(rooms, now), transaction)
  }

  private createUsers(now: Date): Record<string, unknown>[] {
    return Array.from({ length: mockUserCount }, (_, index) => ({
      uid: createDeterministicUuid(`user:${index}`),
      login: `mock.user.${String(index + 1).padStart(4, "0")}@example.com`,
      phone: null,
      password: developmentPasswordHash,
      firstName: `Пользователь ${index + 1}`,
      lastName: "Тестовый",
      surname: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    }))
  }

  private createRoles(now: Date): Record<string, unknown>[] {
    return Array.from({ length: mockRoleCount }, (_, index) => ({
      uid: createDeterministicUuid(`role:${index}`),
      name: `mock_role_${String(index + 1).padStart(2, "0")}`,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    }))
  }

  private createUserRoles(
    users: Record<string, unknown>[],
    roles: Record<string, unknown>[],
    now: Date
  ): Record<string, unknown>[] {
    return users.flatMap((user, userIndex) => {
      const assignedRoleCount = 1 + (userIndex % 3)

      return Array.from({ length: assignedRoleCount }, (_, roleOffset) => ({
        uid: createDeterministicUuid(`user-role:${userIndex}:${roleOffset}`),
        userUid: user.uid,
        roleUid: roles[(userIndex + roleOffset * 7) % roles.length].uid,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      }))
    })
  }

  private createRooms(users: Record<string, unknown>[], now: Date): Array<Record<string, unknown> & MockRoom> {
    return Array.from({ length: mockChatRoomCount }, (_, roomIndex) => {
      const isPrivate = roomIndex % 3 === 0
      const memberCount = isPrivate ? 2 : 3 + (roomIndex % 6)
      const memberUids = Array.from({ length: memberCount }, (_, memberIndex) => {
        const userIndex = (roomIndex * 11 + memberIndex * 37) % users.length
        return String(users[userIndex].uid)
      })

      return {
        uid: createDeterministicUuid(`room:${roomIndex}`),
        type: isPrivate ? "private" : "group",
        status: "active",
        title: isPrivate ? `Личный чат ${roomIndex + 1}` : `Тестовая группа ${roomIndex + 1}`,
        archivedAt: null,
        createdByUserUid: memberUids[0],
        memberUids,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      }
    })
  }

  private createRoomMembers(rooms: Array<Record<string, unknown> & MockRoom>, now: Date): Record<string, unknown>[] {
    return rooms.flatMap((room, roomIndex) => room.memberUids.map((userUid, memberIndex) => ({
      uid: createDeterministicUuid(`room-member:${roomIndex}:${memberIndex}`),
      roomUid: room.uid,
      userUid,
      leftAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    })))
  }

  private createMessages(rooms: Array<Record<string, unknown> & MockRoom>, now: Date): Record<string, unknown>[] {
    return Array.from({ length: mockMessageCount }, (_, messageIndex) => {
      const room = rooms[messageIndex % rooms.length]
      const senderUserUid = room.memberUids[messageIndex % room.memberUids.length]
      const createdAt = new Date(now.getTime() - (mockMessageCount - messageIndex) * 1000)

      return {
        uid: createDeterministicUuid(`message:${messageIndex}`),
        roomUid: room.uid,
        senderUserUid,
        text: `Тестовое сообщение ${messageIndex + 1}`,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null
      }
    })
  }

  private async bulkInsert(
    queryInterface: QueryInterface,
    tableName: string,
    records: Record<string, unknown>[],
    transaction: Transaction
  ): Promise<void> {
    for (let offset = 0; offset < records.length; offset += batchSize) {
      await queryInterface.bulkInsert(tableName, records.slice(offset, offset + batchSize), { transaction })
    }
  }
}

function createDeterministicUuid(value: string): string {
  const hash = createHash("sha256").update(`boilerplate-mock:${value}`).digest("hex")
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}
