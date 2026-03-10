import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "./lib/AuthContext";
import { router } from "./routes";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" />
    </AuthProvider>
  );
}
