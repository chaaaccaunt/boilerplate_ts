export const chatRoomCreateScheme: iContracts.iScheme = {
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

export const chatMessageUpdateScheme: iContracts.iScheme = {
  messageUid: {
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

export const chatMessageDeleteScheme: iContracts.iScheme = {
  messageUid: {
    isPrimitive: {
      string: {
        minLength: 36,
        maxLength: 36
      }
    }
  }
}

export const chatMessageFileDeleteScheme: iContracts.iScheme = {
  messageUid: {
    isPrimitive: {
      string: {
        minLength: 36,
        maxLength: 36
      }
    }
  },
  fileUid: {
    isPrimitive: {
      string: {
        minLength: 1,
        maxLength: 128
      }
    }
  }
}
