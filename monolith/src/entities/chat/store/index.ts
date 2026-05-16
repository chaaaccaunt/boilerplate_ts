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
