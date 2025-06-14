import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import ShareIcon from "@mui/icons-material/Share";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { styled } from "@mui/material/styles";

interface Props {
  closePrompt: () => void;
  doNotShowAgain: () => void;
}

// Styled components
const PromptContainer = styled(Box)(({ theme }) => ({
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  height: "60%",
  zIndex: 3000,
  paddingBottom: theme.spacing(8),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  color: theme.palette.common.white,
}));

const BouncingArrow = styled(ArrowDownwardIcon)(({ theme }) => ({
  fontSize: "2.5rem",
  position: "fixed",
  bottom: theme.spacing(0.5),
  right: theme.spacing(0.5),
  zIndex: 3500,
  color: theme.palette.secondary.main,
  animation: "bounce 2s infinite",
  "@keyframes bounce": {
    "0%, 100%": {
      transform: "translateY(0)",
    },
    "50%": {
      transform: "translateY(10px)",
    },
  },
}));

const ContentCard = styled(Paper)(({ theme }) => ({
  position: "relative",
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(2),
  height: "100%",
  borderRadius: theme.shape.borderRadius * 2,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-around",
  alignItems: "center",
  textAlign: "center",
}));

const ActionButton = styled(Button)(({ theme }) => ({
  border: `2px solid ${theme.palette.primary.main}`,
  padding: theme.spacing(0.5),
  color: theme.palette.primary.main,
}));

const AddToHomeOption = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.grey[900],
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
  borderRadius: theme.shape.borderRadius,
  color: theme.palette.common.white,
}));

export default function AddToMobileFirefoxIos(props: Props) {
  const { closePrompt, doNotShowAgain } = props;
  const theme = useTheme();

  return (
    <PromptContainer>
      <BouncingArrow />
      <ContentCard elevation={3}>
        <IconButton
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            padding: theme.spacing(1.5),
            color: theme.palette.common.white,
          }}
          onClick={closePrompt}
          aria-label="Close"
        >
          <CloseIcon fontSize="medium" />
        </IconButton>

        <Typography variant="body1" fontSize="1.125rem">
          For the best experience, we recommend installing the Control Center app to your home
          screen!
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body1" fontSize="1.125rem">
            Click the
          </Typography>
          <MenuIcon sx={{ fontSize: "2.5rem" }} />
          <Typography variant="body1" fontSize="1.125rem">
            icon
          </Typography>
        </Stack>

        <Stack spacing={1} alignItems="center" width="100%" px={2}>
          <Typography variant="body1" fontSize="1.125rem">
            Scroll down and then click:
          </Typography>
          <AddToHomeOption>
            <Typography variant="body1">Share</Typography>
            <ShareIcon sx={{ fontSize: "1.5rem" }} />
          </AddToHomeOption>
        </Stack>

        <Stack spacing={1} alignItems="center" width="100%" px={2}>
          <Typography variant="body1" fontSize="1.125rem">
            Then click:
          </Typography>
          <AddToHomeOption>
            <Typography variant="body1">Add to Home Screen</Typography>
            <AddBoxOutlinedIcon sx={{ fontSize: "1.5rem" }} />
          </AddToHomeOption>
        </Stack>

        <Divider sx={{ width: "100%", margin: theme.spacing(0) }} />

        <ActionButton variant="outlined" onClick={doNotShowAgain}>
          Don&apos;t show again
        </ActionButton>
      </ContentCard>
    </PromptContainer>
  );
}
