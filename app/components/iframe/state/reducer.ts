import { IframeState, IframeAction } from "@/app/types/iframe";

export interface IframeStateMap {
  [key: string]: IframeState;
}

export function iframeReducer(state: IframeStateMap, action: IframeAction): IframeStateMap {
  switch (action.type) {
    case "SET_STATUS": {
      const { urlId, status } = action.payload;
      return {
        ...state,
        [urlId]: {
          ...state[urlId],
          status,
          // Reset error when changing status
          error: null,
          // Update activity timestamp when changing status
          lastActivity: Date.now(),
        },
      };
    }

    case "SET_ERROR": {
      const { urlId, error } = action.payload;
      return {
        ...state,
        [urlId]: {
          ...state[urlId],
          error,
          // Update status if there's an error
          status: error ? "active-unloaded" : state[urlId].status,
          lastActivity: Date.now(),
        },
      };
    }

    case "UPDATE_ACTIVITY": {
      const { urlId } = action.payload;
      return {
        ...state,
        [urlId]: {
          ...state[urlId],
          lastActivity: Date.now(),
        },
      };
    }

    case "RESET_IFRAME": {
      const { urlId } = action.payload;
      return {
        ...state,
        [urlId]: {
          ...state[urlId],
          status: "active-unloaded",
          error: null,
          lastActivity: Date.now(),
        },
      };
    }

    case "SET_IDLE_TIMEOUT": {
      const { urlId, timeout } = action.payload;
      return {
        ...state,
        [urlId]: {
          ...state[urlId],
          idleTimeout: timeout,
        },
      };
    }

    case "SET_URL": {
      const { urlId, url, urlMobile } = action.payload;
      return {
        ...state,
        [urlId]: {
          ...state[urlId],
          url,
          urlMobile,
          // Reset status and error when changing URL
          status: "inactive-unloaded",
          error: null,
          lastActivity: Date.now(),
        },
      };
    }

    default:
      return state;
  }
}
