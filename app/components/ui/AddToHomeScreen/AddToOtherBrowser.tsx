import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import Link from "next/link";

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

export default function AddToOtherBrowser(props: Props) {
  const { closePrompt, doNotShowAgain } = props;
  const theme = useTheme();
  const searchUrl = `https://www.google.com/search?q=add+to+home+screen+for+common-mobile-browsers`;

  return (
    <PromptContainer>
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

        <Stack spacing={2} alignItems="center">
          <Typography variant="body1" fontSize="1.125rem">
            Unfortunately, we were unable to determine which browser you are using. Please search
            for how to install a web app for your browser.
          </Typography>

          <Link href={searchUrl} target="_blank" passHref>
            <MuiLink
              sx={{
                color: theme.palette.info.main,
                textDecoration: "underline",
              }}
            >
              Try This Search
            </MuiLink>
          </Link>
        </Stack>

        <Divider sx={{ width: "100%", margin: theme.spacing(0) }} />

        <ActionButton variant="outlined" onClick={doNotShowAgain}>
          Don&apos;t show again
        </ActionButton>
      </ContentCard>
    </PromptContainer>
  );
}
