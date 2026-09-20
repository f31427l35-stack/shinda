import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Terminal, ArrowLeft, PhoneCall, RotateCcw, Smartphone, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { executeUssdStep } from "@/services/loanService";

export default function UssdFullPage() {
  const [phone, setPhone] = useState("0722123456");
  const [dialCode, setDialCode] = useState("*384*24#");
  const [isDialed, setIsDialed] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [ussdPath, setUssdPath] = useState<string>("");
  const [screenText, setScreenText] = useState<string>("");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<{ query: string; response: string; timestamp: string }[]>([]);

  const startUssdSession = () => {
    setIsDialed(true);
    setUssdPath("");
    const initial = executeUssdStep("", phone);
    setScreenText(initial.response);
    setIsSessionActive(initial.isContinued);
    setHistoryLogs([{ 
      query: dialCode, 
      response: initial.response,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const handleSendInput = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    const nextPath = ussdPath === "" ? userInput.trim() : `${ussdPath}*${userInput.trim()}`;
    setUssdPath(nextPath);

    const stepResult = executeUssdStep(nextPath, phone);
    setScreenText(stepResult.response);
    setIsSessionActive(stepResult.isContinued);

    setHistoryLogs((prev) => [
      ...prev,
      {
        query: userInput.trim(),
        response: stepResult.response,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
    setUserInput("");
  };

  const handleKeypadClick = (char: string) => {
    if (!isDialed) {
      setDialCode((prev) => prev + char);
    } else {
      setUserInput((prev) => prev + char);
    }
  };

  const handleResetSession = () => {
    setIsDialed(false);
    setDialCode("*384*24#");
    setUssdPath("");
    setScreenText("");
    setIsSessionActive(false);
    setUserInput("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground paper-texture">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Web Portal
            </Link>
            <h1 className="font-serif-heading font-bold text-2xl md:text-3xl text-foreground">
              USSD *384*24# Live Gateway Simulator
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Test and inspect raw USSD string routing, session persistence, and menu depth triggers.
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
            USSD v2.4 Active
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Mobile Terminal View */}
          <div className="md:col-span-5 flex justify-center">
            <div className="w-full max-w-xs bg-neutral-900 border-4 border-neutral-700 rounded-[2.8rem] p-4 shadow-2xl text-white relative overflow-hidden">
              <div className="flex justify-between items-center px-4 py-2 text-xs text-neutral-400">
                <span className="font-mono">Safaricom</span>
                <div className="w-12 h-1 bg-neutral-600 rounded-full" />
                <span className="font-mono">100%</span>
              </div>

              {/* Screen */}
              <div className="my-3 mx-1 bg-neutral-950 border border-neutral-800 rounded-2xl p-4 min-h-[220px] flex flex-col justify-between ussd-screen-glow">
                {!isDialed ? (
                  <div className="flex flex-col items-center justify-center my-auto space-y-2 text-center">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400">
                      Gateway Ready
                    </span>
                    <div className="font-mono text-2xl font-bold tracking-wider text-white">
                      {dialCode}
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Tap Dial below to initiate USSD session
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-3">
                      <div className="text-[10px] font-mono text-neutral-400 border-b border-neutral-800 pb-1 mb-2 flex justify-between">
                        <span>FAULU USSD</span>
                        <span>{isSessionActive ? "ACTIVE" : "ENDED"}</span>
                      </div>
                      <div className="text-xs font-mono text-neutral-200 whitespace-pre-wrap leading-relaxed max-h-[140px] overflow-y-auto">
                        {screenText}
                      </div>
                    </div>

                    {isSessionActive ? (
                      <form onSubmit={handleSendInput} className="flex gap-2">
                        <Input
                          type="text"
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          placeholder="Choice"
                          className="h-8 text-xs font-mono bg-neutral-900 border-neutral-700 text-white"
                          autoFocus
                        />
                        <Button
                          type="submit"
                          size="sm"
                          className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Send
                        </Button>
                      </form>
                    ) : (
                      <div className="text-center pt-1">
                        <Button
                          size="sm"
                          onClick={startUssdSession}
                          className="h-8 text-xs bg-primary hover:bg-primary/90 text-white w-full"
                        >
                          Redial *384*24#
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {ussdPath && (
                  <div className="text-[10px] font-mono text-neutral-500 truncate pt-1 border-t border-neutral-800">
                    *384*24*{ussdPath}#
                  </div>
                )}
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2 px-2 py-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeypadClick(key)}
                    className="h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-white font-mono font-medium text-base flex items-center justify-center transition-all border border-neutral-700/50"
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* Dial button */}
              <div className="flex items-center justify-between px-2 pt-2 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetSession}
                  className="text-xs text-neutral-400 hover:text-white h-8"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Reset
                </Button>

                {!isDialed ? (
                  <Button
                    onClick={startUssdSession}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-6 rounded-full font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-900/40"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    Dial Code
                  </Button>
                ) : (
                  <Button
                    onClick={handleResetSession}
                    variant="outline"
                    className="text-xs border-red-500/40 text-red-400 hover:bg-red-500/10 h-8"
                  >
                    End Session
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Real-time Session Inspection Logs */}
          <div className="md:col-span-7 space-y-4">
            <div className="p-5 bg-card border border-border rounded-2xl space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">
                    USSD Session Request / Response Stream
                  </h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Depth: {ussdPath ? ussdPath.split("*").length : 0}
                </Badge>
              </div>

              <div className="space-y-3 font-mono text-xs max-h-[420px] overflow-y-auto pr-2">
                {historyLogs.length === 0 ? (
                  <div className="text-muted-foreground italic text-center py-8">
                    Dial *384*24# on the left keypad to begin capturing interactive USSD session frames.
                  </div>
                ) : (
                  historyLogs.map((log, idx) => (
                    <div key={idx} className="p-3 bg-muted/50 rounded-xl border border-border space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/50 pb-1">
                        <span className="text-primary font-bold">Step #{idx + 1} - Input: "{log.query}"</span>
                        <span>{log.timestamp}</span>
                      </div>
                      <div className="text-foreground whitespace-pre-wrap leading-relaxed text-[11px]">
                        {log.response}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* USSD Routing Cheatsheet */}
            <div className="p-4 bg-muted/40 rounded-xl border border-border text-xs space-y-2">
              <span className="font-semibold text-foreground uppercase tracking-wider block">
                USSD Quick Dialing Codes
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground font-mono">
                <div>• *384*24*1# - Fast Check</div>
                <div>• *384*24*2# - Categories</div>
                <div>• *384*24*3# - 4x Booster</div>
                <div>• *384*24*0# - Exit Session</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
