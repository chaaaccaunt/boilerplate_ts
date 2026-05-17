export const chatRoomCreateScheme: iContracts.iScheme = {
  type: {
    isPrimitive: {
      string: {
        minLength: 5,
        maxLength: 7,
        reg: /^(group|private)$/
      }
    }
  },
  title: {
    isPrimitive: {
      string: {
        minLength: 1,
        maxLength: 120
      }
    }
  },
  memberUserUids: {
    isArray: {
      isPrimitive: {
        string: {
          minLength: 36,
          maxLength: 36
        }
      }
    }
  }
}

export const chatMessagesListScheme: iContracts.iScheme = {
  roomUid: {
    isPrimitive: {
      string: {
        minLength: 36,
        maxLength: 36
      }
    }
  }
}

export const chatRoomUpdateScheme: iContracts.iScheme = {
  roomUid: {
    isPrimitive: {
      string: {
        minLength: 36,
        maxLength: 36
      }
    }
  },
  title: {
    isPrimitive: {
      string: {
        minLength: 1,
        maxLength: 120
      }
    }
  },
  memberUserUids: {
    isArray: {
      isPrimitive: {
        string: {
          minLength: 36,
          maxLength: 36
        }
      }
    }
  }
}

export const chatRoomDeleteScheme: iContracts.iScheme = {
  roomUid: {
    isPrimitive: {
      string: {
        minLength: 36,
        maxLength: 36
      }
    }
  }
}

export const chatRoomLeaveScheme: iContracts.iScheme = {
  roomUid: {
    isPrimitive: {
      string: {
        minLength: 36,
        maxLength: 36
      }
    }
  }
}

export const chatRoomJoinScheme: iContracts.iScheme = {
  roomUid: {
    isPrimitive: {
      string: {
        minLength: 36,
        maxLength: 36
      }
    }
  }
}

export const chatMessageSendScheme: iContracts.iScheme = {
  roomUid: {
    isPrimitive: {
      string: {
        minLength: 36,
        maxLength: 36
      }
    }
  },
  text: {
    optional: true,
    isPrimitive: {
      string: {
        minLength: 1,
        maxLength: 4000
      }
    }
  },
  files: {
    optional: true,
    isArray: {
      isObject: {
        fileUid: {
          isPrimitive: {
            string: {
              minLength: 1,
              maxLength: 128
            }
          }
        }
      }
    }
  }
}
