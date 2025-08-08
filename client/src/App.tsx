import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/hooks/use-toast";
import { Router, Route, Switch } from "wouter";
import HomePage from "@/pages/HomePage";
import PDFCompress from "@/pages/PDFCompress";
import PDFSplit from "@/pages/PDFSplit";
import PDFMerge from "@/pages/PDFMerge";
import PDFRotate from "@/pages/PDFRotate";
import PDFWatermark from "@/pages/PDFWatermark";
import PDFToJPG from "@/pages/PDFToJPG";
import PDFToWord from "@/pages/PDFToWord";
import JPGToPDF from "@/pages/JPGToPDF";
import VideoCompress from "@/pages/VideoCompress";
import VideoTrim from "@/pages/VideoTrim";
import AudioConverter from "@/pages/AudioConverter";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/pdf-compress" component={PDFCompress} />
            <Route path="/pdf-split" component={PDFSplit} />
            <Route path="/pdf-merge" component={PDFMerge} />
            <Route path="/pdf-rotate" component={PDFRotate} />
            <Route path="/pdf-watermark" component={PDFWatermark} />
            <Route path="/pdf-to-jpg" component={PDFToJPG} />
            <Route path="/pdf-to-word" component={PDFToWord} />
            <Route path="/jpg-to-pdf" component={JPGToPDF} />
            <Route path="/video-compress" component={VideoCompress} />
            <Route path="/video-trim" component={VideoTrim} />
            <Route path="/audio-converter" component={AudioConverter} />
            <Route>
              <div className="min-h-screen flex items-center justify-center">
                <h1 className="text-2xl font-bold">Page Not Found</h1>
              </div>
            </Route>
          </Switch>
        </Router>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;