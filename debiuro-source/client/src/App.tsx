import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import RegistryPage from "./pages/RegistryPage";
import UpdatePage from "./pages/UpdatePage";
import ExportPage from "./pages/ExportPage";
import NotFound from "./pages/not-found";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <Layout>
          <Switch>
            <Route path="/" component={DashboardPage} />
            <Route path="/registry" component={RegistryPage} />
            <Route path="/update" component={UpdatePage} />
            <Route path="/export" component={ExportPage} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}
