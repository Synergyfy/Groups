import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import { router } from "./app/router";
import { AppStoreProvider } from "./store/AppStore";
import JourneyProvider from "./journey/JourneyProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppStoreProvider>
      <JourneyProvider>
        <RouterProvider router={router} />
      </JourneyProvider>
    </AppStoreProvider>
  </StrictMode>
);
