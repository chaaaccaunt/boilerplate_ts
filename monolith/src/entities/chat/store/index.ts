import { Module, MutationTree } from "vuex"

const mutations: MutationTree<iSharedState.ChatState> = {
  setRooms(state, rooms: iSharedChat.ChatRoomDto[]) {
    state.rooms = rooms
  },

  addRoom(state, room: iSharedChat.ChatRoomDto) {
    if (!state.rooms.some((item) => item.uid === room.uid)) {
      state.rooms.push(room)
    }
    state.activeRoomUid = room.uid
  },

  updateRoom(state, room: iSharedChat.ChatRoomDto) {
    state.rooms = state.rooms.map((item) => item.uid === room.uid ? room : item)
  },

  removeRoom(state, roomUid: string) {
    state.rooms = state.rooms.filter((room) => room.uid !== roomUid)
    delete state.messagesByRoomUid[roomUid]

    if (state.activeRoomUid === roomUid) {
      state.activeRoomUid = state.rooms[0]?.uid || null
    }
  },

  setActiveRoomUid(state, roomUid: string) {
    state.activeRoomUid = roomUid
  },

  setMessages(state, payload: { roomUid: string, messages: iSharedChat.ChatMessageDto[] }) {
    state.messagesByRoomUid[payload.roomUid] = payload.messages
  },

  addMessage(state, message: iSharedChat.ChatMessageDto) {
    const messages = state.messagesByRoomUid[message.roomUid] || []
    if (messages.some((item) => item.uid === message.uid)) return
    state.messagesByRoomUid[message.roomUid] = messages.concat(message)
  },

  updateMessage(state, message: iSharedChat.ChatMessageDto) {
    const messages = state.messagesByRoomUid[message.roomUid] || []
    state.messagesByRoomUid[message.roomUid] = messages.map((item) => item.uid === message.uid ? message : item)
  },

  deleteMessage(state, payload: iSharedChat.ChatMessageDeleteResponseDto) {
    const messages = state.messagesByRoomUid[payload.roomUid] || []
    state.messagesByRoomUid[payload.roomUid] = messages.filter((item) => item.uid !== payload.messageUid)
  }
}

export const chat: Module<iSharedState.ChatState, iSharedState.RootState> = {
  namespaced: true,

  state: () => ({
    rooms: [],
    activeRoomUid: null,
    messagesByRoomUid: {}
  }),

  mutations
}
