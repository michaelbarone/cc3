"use client";

import UrlDialog from "@/app/components/ui/UrlDialog";
import { convertToApiPath } from "@/app/lib/utils/file-paths";
import { getEffectiveUrl, UrlWithLocalhost } from "@/app/lib/utils/iframe-utils";
import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GroupIcon from "@mui/icons-material/Group";
import LinkIcon from "@mui/icons-material/Link";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Url extends UrlWithLocalhost {
  title: string;
  iconPath: string | null;
  idleTimeoutMinutes: number;
}

interface UrlInGroup {
  url: Url;
  urlId: string;
  groupId: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface UrlGroup {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  urls: UrlInGroup[];
}

interface User {
  id: string;
  username: string;
  isAdmin: boolean;
}

// Add this component before the main UrlGroupManagement component
const MemoizedUrlItem = React.memo(function UrlItem({
  url,
  index,
  groupId,
  totalUrls,
  onOrderChange,
  onEdit,
  onDelete,
  onSelect,
  isSelected,
}: {
  url: UrlInGroup;
  index: number;
  groupId: string;
  totalUrls: number;
  onOrderChange: (groupId: string, urlId: string, direction: "up" | "down") => Promise<void>;
  onEdit: (url: Url) => void;
  onDelete: (url: Url) => void;
  onSelect: (urlId: string) => void;
  isSelected: boolean;
}) {
  return (
    <ListItem>
      <Checkbox
        edge="start"
        checked={isSelected}
        onChange={() => onSelect(url.url.id)}
        sx={{ mr: 1 }}
      />
      <ListItemText
        primary={
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box sx={{ mr: 1 }}>
              {url.url.iconPath ? (
                <Image
                  src={convertToApiPath(url.url.iconPath)}
                  alt={url.url.title}
                  width={16}
                  height={16}
                  style={{ maxWidth: "100%", height: "auto" }}
                />
              ) : (
                <LinkIcon fontSize="small" />
              )}
            </Box>
            {url.url.title}
          </Box>
        }
        secondary={
          <Box component="div">
            <Typography variant="body2" component="div">
              {url.url.url}
            </Typography>
            {url.url.urlMobile && (
              <Typography variant="body2" color="text.secondary" component="div">
                Mobile: {url.url.urlMobile}
              </Typography>
            )}
          </Box>
        }
        primaryTypographyProps={{ component: "div" }}
        secondaryTypographyProps={{ component: "div" }}
      />
      <ListItemSecondaryAction>
        <Tooltip title="Move Up">
          <span>
            <IconButton
              edge="end"
              aria-label="move up"
              onClick={(e) => {
                e.stopPropagation();
                onOrderChange(groupId, url.url.id, "up");
              }}
              disabled={index === 0}
              size="small"
            >
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Move Down">
          <span>
            <IconButton
              edge="end"
              aria-label="move down"
              onClick={(e) => {
                e.stopPropagation();
                onOrderChange(groupId, url.url.id, "down");
              }}
              disabled={index === totalUrls - 1}
              size="small"
            >
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Preview URL">
          <span>
            <IconButton
              edge="end"
              aria-label="preview"
              onClick={() => window.open(url.url.url, "_blank")}
              size="small"
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Edit URL">
          <span>
            <IconButton edge="end" aria-label="edit" onClick={() => onEdit(url.url)} size="small">
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        {/* <Tooltip title="Delete URL">
          <span>
            <IconButton
              edge="end"
              aria-label="delete"
              onClick={() => onDelete(url.url)}
              color="error"
              size="small"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip> */}
      </ListItemSecondaryAction>
    </ListItem>
  );
});

export default function UrlGroupManagement() {
  const [urlGroups, setUrlGroups] = useState<UrlGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState<
    | "createGroup"
    | "editGroup"
    | "deleteGroup"
    | "createUrl"
    | "editUrl"
    | "deleteUrl"
    | "assignUsers"
  >("createGroup");
  const [selectedGroup, setSelectedGroup] = useState<UrlGroup | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<Url | null>(null);

  // Form state
  const [groupFormValues, setGroupFormValues] = useState({
    name: "",
    description: "",
  });

  const [urlFormValues, setUrlFormValues] = useState({
    title: "",
    url: "",
    urlMobile: "",
    idleTimeoutMinutes: 10,
  });

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  // Expanded accordion state
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [availableUrls, setAvailableUrls] = useState<Url[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Url[]>([]);
  const [loadingUrls, setLoadingUrls] = useState(false);

  const [similarUrls, setSimilarUrls] = useState<
    { id: string; title: string; url: string; inGroup: boolean }[]
  >([]);
  const [showSimilarUrlsDialog, setShowSimilarUrlsDialog] = useState(false);
  const [pendingUrlSubmit, setPendingUrlSubmit] = useState<{
    values: typeof urlFormValues;
    groupId: string;
  } | null>(null);

  const [selectedUrlsForBatch, setSelectedUrlsForBatch] = useState<Set<string>>(new Set());
  const [batchOperationInProgress, setBatchOperationInProgress] = useState(false);

  const [activeUrlId, setActiveUrlId] = useState<string | null>(null);
  const [activeUrl, setActiveUrl] = useState<Url | null>(null);
  const [loadedUrlIds, setLoadedUrlIds] = useState<string[]>([]);
  const [iframeRefs, setIframeRefs] = useState<Record<string, HTMLIFrameElement>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Create a singleton container for iframes outside of React
  let globalIframeContainer: HTMLDivElement | null = null;

  // Memoize the setIframeRefs function to avoid unnecessary re-renders
  const updateIframeRefs = useCallback(
    (updater: (prev: Record<string, HTMLIFrameElement>) => Record<string, HTMLIFrameElement>) => {
      setIframeRefs(updater);
    },
    [],
  );

  // Memoize urlGroups to avoid re-renders when reference changes but content is the same
  const memoizedUrlGroups = useMemo(
    () => urlGroups,
    [
      // Using a more stable dependency method than JSON.stringify which can cause problems with large datasets
      urlGroups.length,
      urlGroups.map((g) => g.id).join(","),
      urlGroups.map((g) => g.urls.length).join(","),
    ],
  );

  // Function to get or create the global iframe container
  function getGlobalIframeContainer() {
    if (!globalIframeContainer) {
      globalIframeContainer = document.createElement("div");
      globalIframeContainer.id = "global-iframe-container";
      globalIframeContainer.style.position = "fixed";
      globalIframeContainer.style.top = "0";
      globalIframeContainer.style.left = "0";
      globalIframeContainer.style.width = "100%";
      globalIframeContainer.style.height = "100%";
      globalIframeContainer.style.pointerEvents = "none";
      globalIframeContainer.style.zIndex = "1000";

      // Ensure the container is added to the body
      if (document.body) {
        document.body.appendChild(globalIframeContainer);
      }
    }
    return globalIframeContainer;
  }

  // Helper function to validate and normalize URL data
  const isValidUrlData = (urlData: any): urlData is UrlInGroup => {
    // Basic validation
    if (!urlData || typeof urlData !== "object") {
      return false;
    }

    // Check URL object exists
    if (!urlData.url || typeof urlData.url !== "object") {
      return false;
    }

    // Required URL properties
    if (!urlData.url.id || typeof urlData.url.id !== "string") {
      return false;
    }

    if (!urlData.url.url && typeof urlData.url.url !== "string") {
      return false;
    }

    // Add isLocalhost if missing (API doesn't return it)
    if (typeof urlData.url.isLocalhost !== "boolean") {
      urlData.url.isLocalhost = false;
    }

    // Other required fields with defaults
    if (typeof urlData.url.title !== "string") {
      urlData.url.title = urlData.url.id;
    }

    if (urlData.url.iconPath !== null && typeof urlData.url.iconPath !== "string") {
      urlData.url.iconPath = null;
    }

    if (typeof urlData.url.idleTimeoutMinutes !== "number") {
      urlData.url.idleTimeoutMinutes = 10;
    }

    // Check displayOrder (required for sorting)
    if (typeof urlData.displayOrder !== "number") {
      urlData.displayOrder = 0;
    }

    // Fill in missing UrlInGroup fields
    if (!urlData.urlId) {
      urlData.urlId = urlData.url.id;
    }

    if (!urlData.groupId && urlData.url.groupId) {
      urlData.groupId = urlData.url.groupId;
    }

    return true;
  };

  // Create iframes on mount
  useEffect(() => {
    if (!document.body) {
      console.error("Document body not available for iframe initialization");
      return;
    }

    // Get or create the global container
    const container = getGlobalIframeContainer();
    if (!container) {
      console.error("Failed to create global iframe container");
      return;
    }

    // Check if we're on a mobile device
    const isMobile = window.matchMedia("(max-width:600px)").matches;

    // Track existing and needed iframe IDs
    const existingIframeIds = new Set(Object.keys(iframeRefs));
    const neededIframeIds = new Set<string>();

    // Create or update iframes for all URLs
    memoizedUrlGroups.forEach((group) => {
      if (!group?.urls?.length) return;

      group.urls.forEach((urlData) => {
        // Use the helper function for validation
        if (!isValidUrlData(urlData)) {
          console.warn("Invalid URL data", urlData);
          return;
        }

        const { url } = urlData;
        const urlId = url.id;
        neededIframeIds.add(urlId);

        // If iframe already exists, just update its data-src if needed
        if (existingIframeIds.has(urlId)) {
          const existingIframe = iframeRefs[urlId];
          const currentDataSrc = existingIframe.getAttribute("data-src");
          const effectiveUrl = getEffectiveUrl(url, isMobile);

          if (currentDataSrc !== effectiveUrl) {
            existingIframe.setAttribute("data-src", effectiveUrl);
            // Only update src if this is the active iframe and it's currently loaded
            if (
              urlId === activeUrlId &&
              existingIframe.src &&
              existingIframe.src !== "about:blank"
            ) {
              existingIframe.src = effectiveUrl;
            }
          }
          return;
        }

        // Create wrapper div for new iframe
        const wrapper = document.createElement("div");
        wrapper.setAttribute("data-iframe-container", urlId);
        wrapper.style.position = "absolute";
        wrapper.style.top = "0";
        wrapper.style.left = "0";
        wrapper.style.width = "100%";
        wrapper.style.height = "100%";
        wrapper.style.overflow = "hidden";
        wrapper.style.pointerEvents = "auto";
        wrapper.style.visibility = urlId === activeUrlId ? "visible" : "hidden";
        wrapper.style.display = urlId === activeUrlId ? "block" : "none";
        wrapper.style.zIndex = urlId === activeUrlId ? "1" : "0";

        // Create new iframe
        const iframe = document.createElement("iframe");
        iframe.setAttribute("data-iframe-id", urlId);
        const effectiveUrl = getEffectiveUrl(url, isMobile);
        iframe.setAttribute("data-src", effectiveUrl);
        iframe.title = `iframe-${urlId}`;
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        iframe.style.background = "#fff";
        iframe.style.overflow = "hidden";
        iframe.setAttribute("sandbox", "allow-scripts allow-forms allow-popups");
        iframe.setAttribute(
          "allow",
          "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture",
        );

        // Store ref and add to DOM
        updateIframeRefs((prev) => ({ ...prev, [urlId]: iframe }));
        wrapper.appendChild(iframe);
        container.appendChild(wrapper);

        // Load active iframe
        if (urlId === activeUrlId) {
          iframe.src = effectiveUrl;
        }
      });
    });

    // Remove any iframes that are no longer needed
    existingIframeIds.forEach((urlId) => {
      if (!neededIframeIds.has(urlId)) {
        const iframe = iframeRefs[urlId];
        if (iframe && iframe.parentElement) {
          iframe.parentElement.remove();
        }
        updateIframeRefs((prev) => {
          const newRefs = { ...prev };
          delete newRefs[urlId];
          return newRefs;
        });
      }
    });

    // Update container position when our container moves
    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        Object.values(iframeRefs).forEach((iframe) => {
          if (iframe.parentElement) {
            iframe.parentElement.style.position = "fixed";
            iframe.parentElement.style.top = `${rect.top}px`;
            iframe.parentElement.style.left = `${rect.left}px`;
            iframe.parentElement.style.width = `${rect.width}px`;
            iframe.parentElement.style.height = `${rect.height}px`;
          }
        });
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Return cleanup function
    return () => {
      observer.disconnect();

      // Remove all iframes
      Object.values(iframeRefs).forEach((iframe) => {
        if (iframe.parentElement) {
          iframe.parentElement.remove();
        }
      });
      updateIframeRefs(() => ({}));

      // Only remove the global container if it's empty
      if (container && container.childNodes.length === 0) {
        container.remove();
        globalIframeContainer = null;
      }
    };
  }, [memoizedUrlGroups, activeUrlId, updateIframeRefs]);

  // Handle active URL changes
  useEffect(() => {
    if (!activeUrlId) return;

    // Get the current state of iframe refs to avoid closure issues
    const currentIframeRefs = { ...iframeRefs };

    // Update visibility and ensure proper loading for all iframes
    Object.entries(currentIframeRefs).forEach(([urlId, iframe]) => {
      const wrapper = iframe.parentElement;
      const isActive = urlId === activeUrlId;

      if (wrapper) {
        // Force a reflow
        wrapper.offsetHeight;

        // Update visibility and z-index
        wrapper.style.display = isActive ? "block" : "none";
        wrapper.style.visibility = isActive ? "visible" : "hidden";
        wrapper.style.zIndex = isActive ? "1" : "0";
        wrapper.style.pointerEvents = isActive ? "auto" : "none";

        // Load the iframe content if it's active and not already loaded
        if (isActive && (!iframe.src || iframe.src === "about:blank")) {
          const dataSrc = iframe.getAttribute("data-src");

          // Find the URL object matching this iframe
          const urlGroup = memoizedUrlGroups.find((group) =>
            group?.urls?.some((u) => u?.url?.id === urlId),
          );

          const urlItem = urlGroup?.urls?.find((u) => u?.url?.id === urlId);

          // Use the helper function for consistent validation
          if (isValidUrlData(urlItem)) {
            const urlData = urlItem.url;
            // Get the effective URL based on current device
            const isMobile = window.matchMedia("(max-width:600px)").matches;
            const effectiveUrl = getEffectiveUrl(urlData, isMobile);
            iframe.src = effectiveUrl;
          } else if (dataSrc) {
            // Fallback to data-src if URL object not found
            iframe.src = dataSrc;
          }
        }
      }
    });
  }, [activeUrlId, memoizedUrlGroups, iframeRefs]);

  const fetchUrlGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/url-groups");

      if (!response.ok) {
        throw new Error("Failed to fetch URL groups");
      }

      const data = await response.json();
      setUrlGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUrlGroups();
  }, []);

  const handleOpenDialog = (
    type:
      | "createGroup"
      | "editGroup"
      | "deleteGroup"
      | "createUrl"
      | "editUrl"
      | "deleteUrl"
      | "assignUsers",
    group?: UrlGroup,
    url?: Url,
  ) => {
    setDialogType(type);

    if (group) {
      setSelectedGroup(group);

      if (type === "editGroup") {
        setGroupFormValues({
          name: group.name,
          description: group.description || "",
        });
      } else if (type === "createUrl") {
        setUrlFormValues({
          title: "",
          url: "",
          urlMobile: "",
          idleTimeoutMinutes: 10,
        });
      }
    } else {
      setSelectedGroup(null);

      if (type === "createGroup") {
        setGroupFormValues({
          name: "",
          description: "",
        });
      }
    }

    if (url) {
      setSelectedUrl(url);

      if (type === "editUrl") {
        setUrlFormValues({
          title: url.title,
          url: url.url,
          urlMobile: url.urlMobile || "",
          idleTimeoutMinutes: url.idleTimeoutMinutes,
        });
      }
    } else {
      setSelectedUrl(null);
    }

    if (type === "assignUsers" && group) {
      fetchUsers();
      fetchAssignedUsers(group.id);
    }

    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleGroupFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setGroupFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleUrlFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setUrlFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleUrlOrderChange = async (groupId: string, urlId: string, direction: "up" | "down") => {
    try {
      // Optimistically update the UI
      setUrlGroups((prevGroups) => {
        return prevGroups.map((group) => {
          if (group.id !== groupId) return group;

          const urls = [...group.urls];
          const currentIndex = urls.findIndex((u) => u.url.id === urlId);
          if (currentIndex === -1) return group;

          const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
          if (newIndex < 0 || newIndex >= urls.length) return group;

          // Swap the items
          [urls[currentIndex], urls[newIndex]] = [urls[newIndex], urls[currentIndex]];

          // Update display orders
          urls[currentIndex].displayOrder = currentIndex;
          urls[newIndex].displayOrder = newIndex;

          return {
            ...group,
            urls,
          };
        });
      });

      // Make API call in background
      const response = await fetch(`/api/admin/url-groups/${groupId}/urls/${urlId}/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ direction }),
      });

      if (!response.ok) {
        throw new Error("Failed to reorder URL");
      }

      // Only show success message, no need to refetch
      setSnackbar({
        open: true,
        message: "URL order updated successfully",
        severity: "success",
      });
    } catch (err) {
      // On error, refresh the list to ensure consistency
      await fetchUrlGroups();

      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to reorder URL",
        severity: "error",
      });
    }
  };

  const handleSubmit = async (formData?: any) => {
    try {
      let response;
      let successMessage = "";

      if (dialogType === "createGroup") {
        // Handle group creation
        const method = "POST";
        const url = "/api/admin/url-groups";

        response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(groupFormValues),
        });

        if (!response.ok) {
          throw new Error("Failed to save URL group");
        }

        successMessage = "URL group created successfully";
      } else if (dialogType === "editGroup") {
        // Handle group editing
        const method = "PUT";
        const url = `/api/admin/url-groups/${selectedGroup?.id}`;

        response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(groupFormValues),
        });

        if (!response.ok) {
          throw new Error("Failed to save URL group");
        }

        successMessage = "URL group updated successfully";
      } else if (dialogType === "deleteGroup") {
        // Handle group deletion
        if (!selectedGroup) {
          throw new Error("No group selected");
        }

        response = await fetch(`/api/admin/url-groups/${selectedGroup.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete URL group");
        }

        successMessage = "URL group deleted successfully";
      } else if (dialogType === "createUrl" && selectedGroup) {
        // For URL creation, we're now using the UrlDialog component
        const urlData = formData || urlFormValues;

        response = await fetch(`/api/admin/url-groups/${selectedGroup.id}/urls`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(urlData),
        });

        if (response.status === 409) {
          // Handle similar URLs
          const data = await response.json();
          setSimilarUrls(data.similarUrls);
          setShowSimilarUrlsDialog(true);
          setPendingUrlSubmit({
            values: urlData,
            groupId: selectedGroup.id,
          });
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to create URL");
        }

        successMessage = "URL created successfully";
      } else if (dialogType === "editUrl" && selectedGroup && selectedUrl) {
        // For URL editing, we're now using the UrlDialog component
        const urlData = formData || urlFormValues;

        response = await fetch(`/api/admin/url-groups/${selectedGroup.id}/urls/${selectedUrl.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(urlData),
        });

        if (!response.ok) {
          throw new Error("Failed to update URL");
        }

        successMessage = "URL updated successfully";
      } else if (dialogType === "deleteUrl" && selectedGroup && selectedUrl) {
        // Handle URL deletion
        response = await fetch(`/api/admin/url-groups/${selectedGroup.id}/urls/${selectedUrl.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete URL");
        }

        successMessage = "URL deleted successfully";
      }

      // Show success message
      setSnackbar({
        open: true,
        message: successMessage,
        severity: "success",
      });

      // Refresh the URL groups
      await fetchUrlGroups();
      handleCloseDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "An unknown error occurred",
        severity: "error",
      });
    }
  };

  const handleForceUrlSubmit = async () => {
    try {
      if (!pendingUrlSubmit) {
        throw new Error("No pending URL submission");
      }

      const { values, groupId } = pendingUrlSubmit;

      const response = await fetch(`/api/admin/url-groups/${groupId}/urls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          force: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create URL");
      }

      setSnackbar({
        open: true,
        message: "URL created successfully",
        severity: "success",
      });

      // Reset state
      setShowSimilarUrlsDialog(false);
      setPendingUrlSubmit(null);
      setSimilarUrls([]);

      // Refresh the URL groups
      await fetchUrlGroups();
      handleCloseDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to create URL",
        severity: "error",
      });
    }
  };

  const handleAccordionChange = (groupId: string) => {
    setExpandedGroupId(expandedGroupId === groupId ? null : groupId);
  };

  // Fetch users for the assignment dialog
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch("/api/admin/users");

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to fetch users",
        severity: "error",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch users assigned to a URL group
  const fetchAssignedUsers = async (groupId: string) => {
    try {
      setLoadingUsers(true);
      const response = await fetch(`/api/admin/url-groups/${groupId}/users`);

      if (!response.ok) {
        throw new Error("Failed to fetch assigned users");
      }

      const data = await response.json();
      setSelectedUsers(data.users.map((user: User) => user.id));
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to fetch assigned users",
        severity: "error",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Handle user selection for URL group assignments
  const handleUserToggle = (userId: string) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Handle saving user assignments to a URL group
  const handleSaveUserAssignments = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/admin/url-groups/${selectedGroup.id}/users`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedUsers }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || "Failed to save user assignments");
      }

      setSnackbar({
        open: true,
        message: "User assignments saved successfully",
        severity: "success",
      });

      handleCloseDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to save user assignments",
        severity: "error",
      });
    }
  };

  // Fetch available URLs
  const fetchAvailableUrls = async () => {
    try {
      setLoadingUrls(true);
      const response = await fetch("/api/admin/urls");

      if (!response.ok) {
        throw new Error("Failed to fetch URLs");
      }

      const data = (await response.json()) as Url[];

      // Set all URLs as available (we'll filter in the Autocomplete component)
      setAvailableUrls(data);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to fetch URLs",
        severity: "error",
      });
    } finally {
      setLoadingUrls(false);
    }
  };

  // Add URL selection dialog
  const [openUrlSelectionDialog, setOpenUrlSelectionDialog] = useState(false);

  const handleOpenUrlSelectionDialog = () => {
    fetchAvailableUrls();
    setOpenUrlSelectionDialog(true);
  };

  const handleCloseUrlSelectionDialog = () => {
    setOpenUrlSelectionDialog(false);
  };

  const handleUrlSelection = (urls: Url[]) => {
    setSelectedUrls(urls);
  };

  const handleSaveUrlSelection = async () => {
    if (!selectedGroup) return;

    try {
      // Get all selected URL IDs
      const selectedUrlIds = selectedUrls.map((url) => url.id);

      // Make a single API call to update all URLs for the group
      const response = await fetch(`/api/admin/url-groups/${selectedGroup.id}/urls`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlIds: selectedUrlIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || "Failed to update URLs");
      }

      setSnackbar({
        open: true,
        message: "URLs updated successfully",
        severity: "success",
      });

      fetchUrlGroups();
      handleCloseUrlSelectionDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to update URLs",
        severity: "error",
      });
    }
  };

  const handleBatchSelect = (urlId: string) => {
    setSelectedUrlsForBatch((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(urlId)) {
        newSet.delete(urlId);
      } else {
        newSet.add(urlId);
      }
      return newSet;
    });
  };

  const handleBatchOperation = async (
    groupId: string,
    operation: "moveToTop" | "moveToBottom" | "remove",
  ) => {
    if (selectedUrlsForBatch.size === 0) return;

    try {
      setBatchOperationInProgress(true);
      const response = await fetch(`/api/admin/url-groups/${groupId}/urls/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urlIds: Array.from(selectedUrlsForBatch),
          operation,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to perform batch operation");
      }

      // Refresh the URL groups to get updated order
      await fetchUrlGroups();

      setSnackbar({
        open: true,
        message: "Batch operation completed successfully",
        severity: "success",
      });

      // Clear selection after successful operation
      setSelectedUrlsForBatch(new Set());
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to perform batch operation",
        severity: "error",
      });
    } finally {
      setBatchOperationInProgress(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h4" component="h1">
          URL Groups
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog("createGroup")}
        >
          Create Group
        </Button>
      </Box>

      {urlGroups.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body1">
            No URL groups found. Create your first group to get started.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {urlGroups.map((group) => (
            <Grid item xs={12} key={group.id}>
              <Accordion
                expanded={expandedGroupId === group.id}
                onChange={() => handleAccordionChange(group.id)}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`panel-${group.id}-content`}
                  id={`panel-${group.id}-header`}
                  component="div"
                >
                  <Box sx={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="h6">{group.name}</Typography>
                    <Box>
                      <Tooltip title="Edit Group">
                        <span>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDialog("editGroup", group);
                            }}
                            size="small"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Delete Group">
                        <span>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDialog("deleteGroup", group);
                            }}
                            size="small"
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Assign to Users">
                        <span>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDialog("assignUsers", group);
                            }}
                            size="small"
                            color="primary"
                          >
                            <GroupIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {group.description || "No description provided"}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    {/* <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenDialog("createUrl", group)}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      Add URL
                    </Button> */}
                    <Button
                      variant="outlined"
                      startIcon={<LinkIcon />}
                      onClick={() => {
                        setSelectedGroup(group);
                        // Pre-select URLs that are already in the group
                        setSelectedUrls(group.urls.map((u) => u.url));
                        handleOpenUrlSelectionDialog();
                      }}
                      size="small"
                    >
                      Manage URLs
                    </Button>
                  </Box>

                  <List sx={{ width: "100%" }}>
                    {group.urls.length === 0 ? (
                      <ListItem>
                        <ListItemText
                          primary="No URLs in this group"
                          primaryTypographyProps={{ component: "div" }}
                        />
                      </ListItem>
                    ) : (
                      <>
                        {selectedUrlsForBatch.size > 0 && (
                          <ListItem>
                            <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleBatchOperation(group.id, "moveToTop")}
                                disabled={batchOperationInProgress}
                              >
                                Move to Top
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleBatchOperation(group.id, "moveToBottom")}
                                disabled={batchOperationInProgress}
                              >
                                Move to Bottom
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                onClick={() => handleBatchOperation(group.id, "remove")}
                                disabled={batchOperationInProgress}
                              >
                                Remove Selected
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => setSelectedUrlsForBatch(new Set())}
                                disabled={batchOperationInProgress}
                              >
                                Clear Selection
                              </Button>
                            </Box>
                          </ListItem>
                        )}
                        {group.urls
                          .sort((a, b) => a.displayOrder - b.displayOrder)
                          .map((url, index) => (
                            <React.Fragment key={url.url.id}>
                              <MemoizedUrlItem
                                url={url}
                                index={index}
                                groupId={group.id}
                                totalUrls={group.urls.length}
                                onOrderChange={handleUrlOrderChange}
                                onEdit={(url) => handleOpenDialog("editUrl", group, url)}
                                onDelete={(url) => handleOpenDialog("deleteUrl", group, url)}
                                onSelect={handleBatchSelect}
                                isSelected={selectedUrlsForBatch.has(url.url.id)}
                              />
                              {index < group.urls.length - 1 && <Divider component="li" />}
                            </React.Fragment>
                          ))}
                      </>
                    )}
                  </List>
                </AccordionDetails>
              </Accordion>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Group Dialogs */}
      <Dialog
        open={openDialog && (dialogType === "createGroup" || dialogType === "editGroup")}
        onClose={handleCloseDialog}
      >
        <DialogTitle>
          {dialogType === "createGroup" ? "Create New URL Group" : "Edit URL Group"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Group Name"
            fullWidth
            variant="outlined"
            value={groupFormValues.name}
            onChange={handleGroupFormChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="description"
            label="Description"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={groupFormValues.description}
            onChange={handleGroupFormChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={() => handleSubmit()} variant="contained">
            {dialogType === "createGroup" ? "Create" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* URL Dialogs */}
      {(dialogType === "createUrl" || dialogType === "editUrl") && (
        <UrlDialog
          open={openDialog}
          onClose={handleCloseDialog}
          onSubmit={handleSubmit}
          initialValues={selectedUrl || undefined}
          dialogTitle={dialogType === "createUrl" ? "Add New URL" : "Edit URL"}
          submitButtonText={dialogType === "createUrl" ? "Add" : "Save"}
        />
      )}

      {/* Delete Confirmation Dialogs */}
      <Dialog
        open={openDialog && (dialogType === "deleteGroup" || dialogType === "deleteUrl")}
        onClose={handleCloseDialog}
      >
        <DialogTitle>
          {dialogType === "deleteGroup" ? "Delete URL Group" : "Delete URL"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {dialogType === "deleteGroup"
              ? `Are you sure you want to delete the URL group "${selectedGroup?.name}"? This will also delete all URLs within this group and remove it from all users.`
              : `Are you sure you want to delete the URL "${selectedUrl?.title}"?`}
            <br />
            <br />
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={() => handleSubmit()} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Assignment Dialog - Replace the existing placeholder */}
      <Dialog
        open={openDialog && dialogType === "assignUsers"}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Assign Users to {selectedGroup?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select which users should have access to this URL group
          </Typography>

          {loadingUsers ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : users.length === 0 ? (
            <Typography variant="body1" sx={{ textAlign: "center", py: 2 }}>
              No users found
            </Typography>
          ) : (
            <List sx={{ maxHeight: "400px", overflow: "auto" }}>
              {users.map((user) => (
                <ListItem key={user.id}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleUserToggle(user.id)}
                      />
                    }
                    label={
                      <Box component="span" sx={{ display: "flex", alignItems: "center" }}>
                        <Typography variant="body1">{user.username}</Typography>
                        {user.isAdmin && (
                          <Chip label="Admin" size="small" color="primary" sx={{ ml: 1 }} />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveUserAssignments} variant="contained" disabled={loadingUsers}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* URL Selection Dialog */}
      <Dialog
        open={openUrlSelectionDialog}
        onClose={handleCloseUrlSelectionDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Manage URLs for {selectedGroup?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select or deselect URLs for this group. Selected URLs will be removed from the dropdown
            menu.
          </Typography>

          {loadingUrls ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Autocomplete
              multiple
              options={availableUrls.filter(
                (url) =>
                  // Only show URLs that aren't already selected
                  !selectedUrls.some((selectedUrl) => selectedUrl.id === url.id),
              )}
              getOptionLabel={(option) => option.title}
              value={selectedUrls}
              onChange={(_, newValue) => handleUrlSelection(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="Search URLs"
                  placeholder="Type to search..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <SearchIcon color="action" />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    {option.iconPath ? (
                      <Image
                        src={convertToApiPath(option.iconPath)}
                        alt={option.title}
                        width={16}
                        height={16}
                        style={{ maxWidth: "100%", height: "auto", marginRight: 8 }}
                      />
                    ) : (
                      <LinkIcon fontSize="small" sx={{ mr: 1 }} />
                    )}
                    <Box>
                      <Typography variant="body1">{option.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.url}
                        {option.urlMobile && (
                          <Typography component="span" variant="body2" color="text.secondary">
                            {" "}
                            (Mobile: {option.urlMobile})
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                  </Box>
                </li>
              )}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUrlSelectionDialog}>Cancel</Button>
          <Button onClick={handleSaveUrlSelection} variant="contained" disabled={loadingUrls}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Similar URLs Dialog */}
      <Dialog
        open={showSimilarUrlsDialog}
        onClose={() => {
          setShowSimilarUrlsDialog(false);
          setPendingUrlSubmit(null);
          setSimilarUrls([]);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Similar URLs Found</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              mb: 4,
              p: 2,
              bgcolor: "background.paper",
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="subtitle2" color="primary" gutterBottom>
              New URL you are trying to add:
            </Typography>
            <Typography variant="body1" gutterBottom>
              {pendingUrlSubmit?.values.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {pendingUrlSubmit?.values.url}
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The following similar URLs already exist in the system:
          </Typography>
          <List>
            {similarUrls.map((url) => (
              <ListItem key={url.id} sx={{ bgcolor: "action.hover", mb: 1, borderRadius: 1 }}>
                <ListItemText
                  primary={url.title}
                  secondary={
                    <Box>
                      <Typography variant="body2" component="span">
                        {url.url}
                      </Typography>
                      {url.inGroup && (
                        <Typography variant="body2" color="warning.main" component="div">
                          This URL is already assigned to a group
                        </Typography>
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{ component: "div" }}
                  secondaryTypographyProps={{ component: "div" }}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowSimilarUrlsDialog(false);
              setPendingUrlSubmit(null);
              setSimilarUrls([]);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleForceUrlSubmit} variant="contained" color="warning">
            Create Anyway
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
