import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PlayGame from "./pages/PlayGame";
import Progress from "./pages/Progress";
import Leaderboard from "./pages/Leaderboard";
import Vocabulary from "./pages/Vocabulary";
import AdminWords from "./pages/AdminWords";
import Login from "./pages/Login";
import Register from "./pages/Register";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/play/:type"} component={PlayGame} />
      <Route path={"/progress"} component={Progress} />
      <Route path={"/leaderboard"} component={Leaderboard} />
      <Route path={"/vocabulary"} component={Vocabulary} />
      <Route path={"/admin"} component={AdminWords} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-center" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
