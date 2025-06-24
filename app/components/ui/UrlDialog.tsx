import { getEffectiveUrl } from "@/app/lib/utils/iframe-utils";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";

interface Url {
  id?: string;
  title: string;
  url: string;
  urlMobile: string | null;
  iconPath?: string | null;
  idleTimeoutMinutes: number | null;
  isLocalhost: boolean;
  openInNewTab: boolean;
  port?: string | null;
  path?: string | null;
  localhostMobilePath?: string | null;
  localhostMobilePort?: string | null;
  enableMobileOverride?: boolean;
  createdAt?: string;
  updatedAt?: string;
  saveAndAddAnother?: boolean;
}

interface UrlDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (urlData: Url) => void;
  initialValues?: Partial<Url>;
  dialogTitle: string;
  submitButtonText: string;
  showSaveAndAddAnother?: boolean;
}

export default function UrlDialog({
  open,
  onClose,
  onSubmit,
  initialValues,
  dialogTitle,
  submitButtonText,
  showSaveAndAddAnother = false,
}: UrlDialogProps) {
  const [formValues, setFormValues] = useState<Url>({
    title: "",
    url: "",
    urlMobile: "",
    iconPath: null,
    idleTimeoutMinutes: 0,
    isLocalhost: false,
    openInNewTab: false,
    port: "",
    path: "",
    enableMobileOverride: false,
    localhostMobilePort: "",
    localhostMobilePath: "",
  } as Url);

  useEffect(() => {
    if (initialValues) {
      const hasMobileOverride = !!(
        initialValues.localhostMobilePort || initialValues.localhostMobilePath
      );
      setFormValues({
        ...formValues,
        ...initialValues,
        openInNewTab: initialValues.openInNewTab ?? false,
        enableMobileOverride: hasMobileOverride,
      } as Url);
    } else if (open) {
      // Reset form values when dialog opens with no initialValues
      setFormValues({
        title: "",
        url: "",
        urlMobile: "",
        iconPath: null,
        idleTimeoutMinutes: 0,
        isLocalhost: false,
        openInNewTab: false,
        port: "",
        path: "",
        enableMobileOverride: false,
        localhostMobilePort: "",
        localhostMobilePath: "",
      } as Url);
    }
  }, [initialValues, open]);

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: name === "idleTimeoutMinutes" ? Number(value) || 0 : value,
    }));
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const isFormValid = () => {
    if (formValues.title.trim() === "") return false;

    if (formValues.isLocalhost) {
      // For localhost, require at least port or path
      const hasPortOrPath = !!formValues.port || !!formValues.path;
      // If path is provided, it must start with /
      const pathValid = !formValues.path || formValues.path.startsWith("/");
      // Check mobile override if enabled
      const mobileValid =
        !formValues.enableMobileOverride ||
        !formValues.localhostMobilePath ||
        formValues.localhostMobilePath.startsWith("/");

      return hasPortOrPath && pathValid && mobileValid;
    } else {
      // For regular URLs, require the url field
      return formValues.url.trim() !== "";
    }
  };

  const handleSubmit = (saveAndAddAnother = false) => {
    if (!isFormValid()) return;

    const submitData = {
      ...formValues,
      idleTimeoutMinutes: Number(formValues.idleTimeoutMinutes) || 0,
      // Set to null any mobile override fields if not enabled
      localhostMobilePort: formValues.enableMobileOverride ? formValues.localhostMobilePort : null,
      localhostMobilePath: formValues.enableMobileOverride ? formValues.localhostMobilePath : null,
      saveAndAddAnother,
    };

    onSubmit(submitData);

    // Reset the form immediately if using Save and Add Another
    if (saveAndAddAnother) {
      resetForm();
    }
  };

  // Function to reset the form
  const resetForm = () => {
    setFormValues({
      title: "",
      url: "",
      urlMobile: "",
      iconPath: null,
      idleTimeoutMinutes: 0,
      isLocalhost: false,
      openInNewTab: false,
      port: "",
      path: "",
      enableMobileOverride: false,
      localhostMobilePort: "",
      localhostMobilePath: "",
    } as Url);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{dialogTitle}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              autoFocus
              margin="dense"
              name="title"
              label="Title"
              fullWidth
              variant="outlined"
              value={formValues.title}
              onChange={handleFormChange}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  name="isLocalhost"
                  checked={formValues.isLocalhost}
                  onChange={handleCheckboxChange}
                />
              }
              label="Localhost Connection"
            />
          </Grid>

          {formValues.isLocalhost ? (
            <>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Will use current browser hostname:{" "}
                  {typeof window !== "undefined" ? window.location.hostname : "localhost"}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  name="url"
                  label="Original URL (for reference)"
                  fullWidth
                  variant="outlined"
                  value={formValues.url}
                  onChange={handleFormChange}
                  helperText="This URL will be used for reference only. The actual localhost URL will be generated based on port and path."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  margin="dense"
                  name="port"
                  label="Port (optional if Path provided)"
                  placeholder="8080"
                  fullWidth
                  variant="outlined"
                  value={formValues.port || ""}
                  onChange={handleFormChange}
                  error={!formValues.port && !formValues.path ? true : false}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  margin="dense"
                  name="path"
                  label="Path (optional if Port provided)"
                  placeholder="/api/data?param=value"
                  fullWidth
                  variant="outlined"
                  value={formValues.path || ""}
                  onChange={handleFormChange}
                  error={
                    (!formValues.port && !formValues.path) ||
                    (formValues.path && !formValues.path.startsWith("/"))
                      ? true
                      : false
                  }
                  helperText={
                    formValues.path && !formValues.path.startsWith("/")
                      ? "Path must start with /"
                      : !formValues.port && !formValues.path
                        ? "At least one of Port or Path must be provided"
                        : ""
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ mt: 2, p: 1, bgcolor: "background.paper", borderRadius: 1 }}>
                  <Typography variant="subtitle2">Preview:</Typography>
                  <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                    {getEffectiveUrl(
                      {
                        id: formValues.id || "preview",
                        url: formValues.url || "",
                        isLocalhost: formValues.isLocalhost,
                        port: formValues.port || null,
                        path: formValues.path || null,
                      },
                      false,
                    )}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="enableMobileOverride"
                      checked={formValues.enableMobileOverride}
                      onChange={handleCheckboxChange}
                    />
                  }
                  label="Enable mobile-specific settings"
                />
              </Grid>

              {formValues.enableMobileOverride && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      margin="dense"
                      name="localhostMobilePort"
                      label="Mobile Port (optional)"
                      placeholder="9090"
                      fullWidth
                      variant="outlined"
                      value={formValues.localhostMobilePort || ""}
                      onChange={handleFormChange}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      margin="dense"
                      name="localhostMobilePath"
                      label="Mobile Path (optional)"
                      placeholder="/mobile/api"
                      fullWidth
                      variant="outlined"
                      value={formValues.localhostMobilePath || ""}
                      onChange={handleFormChange}
                      error={
                        formValues.localhostMobilePath &&
                        !formValues.localhostMobilePath.startsWith("/")
                          ? true
                          : false
                      }
                      helperText={
                        formValues.localhostMobilePath &&
                        !formValues.localhostMobilePath.startsWith("/")
                          ? "Path must start with /"
                          : ""
                      }
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ mt: 2, p: 1, bgcolor: "background.paper", borderRadius: 1 }}>
                      <Typography variant="subtitle2">Mobile Preview:</Typography>
                      <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                        {getEffectiveUrl(
                          {
                            id: formValues.id || "preview",
                            url: formValues.url || "",
                            isLocalhost: formValues.isLocalhost,
                            port: formValues.port || null,
                            path: formValues.path || null,
                            localhostMobilePort: formValues.localhostMobilePort || null,
                            localhostMobilePath: formValues.localhostMobilePath || null,
                          },
                          true,
                        )}
                      </Typography>
                    </Box>
                  </Grid>
                </>
              )}
            </>
          ) : (
            <>
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  name="url"
                  label="URL"
                  fullWidth
                  variant="outlined"
                  value={formValues.url}
                  onChange={handleFormChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  name="urlMobile"
                  label="Mobile URL (optional)"
                  fullWidth
                  variant="outlined"
                  value={formValues.urlMobile || ""}
                  onChange={handleFormChange}
                />
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <Tooltip title="This feature is not yet available.">
              <TextField
                margin="dense"
                name="idleTimeoutMinutes"
                label="Idle Timeout (minutes)"
                type="number"
                inputProps={{ min: 0 }}
                helperText="Minutes before iframe is unloaded when inactive. Set to 0 to disable auto-unloading."
                fullWidth
                variant="outlined"
                value={formValues.idleTimeoutMinutes || 0}
                onChange={handleFormChange}
                disabled={true}
              />
            </Tooltip>
          </Grid>

          <Grid item xs={12}>
            <Tooltip title="For websites that do not support iframe embedding, this will open the URL in a new tab instead of inside this app.">
              <FormControlLabel
                control={
                  <Checkbox
                    name="openInNewTab"
                    checked={formValues.openInNewTab}
                    onChange={handleCheckboxChange}
                  />
                }
                label="Open in new tab"
              />
            </Tooltip>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {showSaveAndAddAnother && (
          <Button onClick={() => handleSubmit(true)} variant="outlined" disabled={!isFormValid()}>
            Save and Add Another
          </Button>
        )}
        <Button onClick={() => handleSubmit(false)} variant="contained" disabled={!isFormValid()}>
          {submitButtonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
