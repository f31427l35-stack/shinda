import HomePage from "./pages/HomePage";
import TrackApplicationPage from "./pages/TrackApplicationPage";
import NotFound from "./pages/NotFound";
import type { ReactNode } from "react";

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: "Faulu Loan Portal",
    path: "/",
    element: <HomePage />,
    public: true,
  },
  {
    name: "Track Application",
    path: "/track",
    element: <TrackApplicationPage />,
    public: true,
  },
  {
    name: "Not Found",
    path: "*",
    element: <NotFound />,
    public: true,
  }
];
