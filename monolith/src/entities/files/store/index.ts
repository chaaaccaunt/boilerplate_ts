import { Module, MutationTree } from "vuex"

const mutations: MutationTree<iSharedState.FilesState> = {
  setFiles(state, payload: { files: iSharedFiles.UploadedFileDto[] }) {
    state.files = payload.files
  },

  addFile(state, file: iSharedFiles.UploadedFileDto) {
    state.files = [file, ...state.files.filter((item) => item.fileUid !== file.fileUid)]
  },

  updateFile(state, file: iSharedFiles.UploadedFileDto) {
    state.files = state.files.map((item) => item.fileUid === file.fileUid ? file : item)
  },

  deleteFile(state, payload: iSharedFiles.DeleteFileResponseDto) {
    state.files = state.files.filter((item) => item.fileUid !== payload.fileUid)
  }
}

export const files: Module<iSharedState.FilesState, iSharedState.RootState> = {
  namespaced: true,

  state: () => ({
    files: []
  }),

  mutations
}
