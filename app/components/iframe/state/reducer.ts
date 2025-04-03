import { IframeAction, IframeState } from "@/app/types/iframe";

export interface IframeStateMap {
  [key: string]: IframeState;
}

export function iframeReducer(state: IframeStateMap, action: IframeAction): IframeStateMap {
  switch (action.type) {
    case "INIT_URLS": {
      const { urlGroups, initialUrlId } = action.payload;
      const newState: IframeStateMap = {};
      urlGroups.forEach((group) => {
        group.urls.forEach((url) => {
          newState[url.id] = {
            urls: {
              [url.id]: {
                id: url.id,
                url: url.url,
                urlMobile: url.urlMobile || null,
                isLoaded: false,
                isVisible: false,
                error: null,
                retryCount: 0,
              },
            },
            activeUrlId: null,
            initialUrlId: null,
          };
        });
      });
      return newState;
    }

    case "SELECT_URL":
    case "LOAD_URL":
    case "UNLOAD_URL":
    case "SET_ERROR": {
      const { urlId } = action.payload;
      const currentState = state[urlId];
      if (!currentState) return state;

      const currentUrl = currentState.urls[urlId];
      if (!currentUrl) return state;

      const updatedUrl = {
        ...currentUrl,
        isLoaded:
          action.type === "LOAD_URL"
            ? true
            : action.type === "UNLOAD_URL"
              ? false
              : currentUrl.isLoaded,
        isVisible:
          action.type === "SELECT_URL"
            ? true
            : action.type === "UNLOAD_URL"
              ? false
              : currentUrl.isVisible,
        error:
          action.type === "SET_ERROR"
            ? action.payload.error
            : action.type === "LOAD_URL"
              ? null
              : currentUrl.error,
      };

      return {
        ...state,
        [urlId]: {
          ...currentState,
          urls: { ...currentState.urls, [urlId]: updatedUrl },
          activeUrlId: action.type === "SELECT_URL" ? urlId : currentState.activeUrlId,
        },
      };
    }

    default:
      return state;
  }
}
