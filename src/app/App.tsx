import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "./lib/AuthContext";
import { DataProvider } from "./lib/DataContext";
import { router } from "./routes";

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" />
      </DataProvider>
    </AuthProvider>
  );
}
