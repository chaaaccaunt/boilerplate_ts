import { Module, MutationTree } from "vuex"

const mutations: MutationTree<iSharedState.FilesState> = {
  setOwners(state, payload: iSharedFiles.ListFileOwnersResponseDto) {
    state.owners = payload.owners
    state.files = []
    state.folders = []
    state.documents = []
    state.currentOwner = null
    state.currentFolder = null
    state.breadcrumbs = []
  },

  setContent(state, payload: iSharedFiles.ListFolderContentResponseDto) {
    state.files = payload.files
    state.folders = payload.folders
    state.documents = payload.documents
    state.currentOwner = payload.owner
    state.currentFolder = payload.folder
    state.breadcrumbs = payload.breadcrumbs
  },

  addFile(state, file: iSharedFiles.UploadedFileDto) {
    state.files = [file, ...state.files.filter((item) => item.fileUid !== file.fileUid)]
  },

  updateFile(state, file: iSharedFiles.UploadedFileDto) {
    state.files = state.files.map((item) => item.fileUid === file.fileUid ? file : item)
  },

  deleteFile(state, payload: iSharedFiles.DeleteFileResponseDto) {
    state.files = state.files.filter((item) => item.fileUid !== payload.fileUid)
  },

  addDocument(state, document: iSharedFiles.StoredDocumentDto) {
    state.documents = [document, ...state.documents.filter((item) => item.documentUid !== document.documentUid)]
  },

  updateDocument(state, document: iSharedFiles.StoredDocumentDto) {
    state.documents = state.documents.map((item) => item.documentUid === document.documentUid ? document : item)
  },

  deleteDocument(state, payload: iSharedFiles.DeleteDocumentResponseDto) {
    state.documents = state.documents.filter((item) => item.documentUid !== payload.documentUid)
  },

  addFolder(state, folder: iSharedFiles.FileFolderDto) {
    state.folders = [folder, ...state.folders.filter((item) => item.uid !== folder.uid)]
      .sort((left, right) => left.title.localeCompare(right.title))
  },

  updateFolder(state, folder: iSharedFiles.FileFolderDto) {
    state.folders = state.folders.map((item) => item.uid === folder.uid ? folder : item)
    if (state.currentFolder?.uid === folder.uid) {
      state.currentFolder = folder
      state.breadcrumbs = state.breadcrumbs.map((item) => item.uid === folder.uid ? folder : item)
    }
  },

  deleteFolder(state, payload: iSharedFiles.DeleteFileFolderResponseDto) {
    state.folders = state.folders.filter((item) => item.uid !== payload.folderUid)
  }
}

export const files: Module<iSharedState.FilesState, iSharedState.RootState> = {
  namespaced: true,

  state: () => ({
    owners: [],
    files: [],
    folders: [],
    documents: [],
    currentOwner: null,
    currentFolder: null,
    breadcrumbs: []
  }),

  mutations
}
