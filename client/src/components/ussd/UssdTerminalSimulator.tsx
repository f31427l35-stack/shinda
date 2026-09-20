import React, { useState } from "react";
import { motion } from "motion/react";
import { Terminal, Send, RotateCcw, X, PhoneCall, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { executeUssdStep } from "@/services/loanService";

interface UssdTerminalSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPhone?: string;
}

export const UssdTerminalSimulator: React.FC<UssdTerminalSimulatorProps> = ({
  isOpen,
  onClose,
  defaultPhone = "0711074000"
}) => {
  const [phone, setPhone] = useState(defaultPhone);
  const [dialCode, setDialCode] = useState("*384*24#");
  const [isDialed, setIsDialed] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [ussdPath, setUssdPath] = useState<string>("");
  const [screenText, setScreenText] = useState<string>("");
  const [isSessionActive, setIsSessionActive] = useState(false);

  if (!isOpen) return null;

  const startUssdSession = () => {
    setIsDialed(true);
    setUssdPath("");
    const initial = executeUssdStep("", phone);
    setScreenText(initial.response);
    setIsSessionActive(initial.isContinued);
  };

  const handleSendInput = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    const nextPath = ussdPath === "" ? userInput.trim() : `${ussdPath}*${userInput.trim()}`;
    setUssdPath(nextPath);

    const stepResult = executeUssdStep(nextPath, phone);
    setScreenText(stepResult.response);
    setIsSessionActive(stepResult.isContinued);
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-sm bg-slate-900 border-4 border-slate-700/80 rounded-[3rem] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.7)] text-white relative overflow-hidden"
      >
        {/* Top Speaker Notch */}
        <div className="flex justify-between items-center px-4 py-1 text-xs text-slate-400">
          <span className="font-mono text-[11px]">Safaricom 4G</span>
          <div className="w-14 h-1.5 bg-slate-700 rounded-full" />
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* Screen Display Area */}
        <div className="my-4 mx-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[220px] flex flex-col justify-between ussd-screen-glow">
          {!isDialed ? (
            <div className="flex flex-col items-center justify-center my-auto space-y-2 text-center">
              <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-bold">
                USSD Gateway Ready
              </span>
              <div className="font-mono text-3xl font-extrabold tracking-wider text-white">
                {dialCode}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Tap Dial below to execute *384*24# loan gateway
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Active USSD Dialog Box */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-inner">
                <div className="text-[10px] font-mono text-slate-400 border-b border-slate-800 pb-1 mb-2 flex justify-between">
                  <span className="font-bold text-blue-400">FAULU USSD</span>
                  <span className="text-emerald-400">{isSessionActive ? "ACTIVE" : "ENDED"}</span>
                </div>
                <div className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[140px] overflow-y-auto">
                  {screenText}
                </div>
              </div>

              {/* Input Form for USSD selection */}
              {isSessionActive ? (
                <form onSubmit={handleSendInput} className="flex gap-2">
                  <Input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Enter choice (1, 2, 3, 0)"
                    className="h-9 text-xs font-mono bg-slate-900 border-slate-700 text-white rounded-xl"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 px-4 text-xs font-bold clay-button-emerald rounded-xl"
                  >
                    Send
                  </Button>
                </form>
              ) : (
                <div className="text-center pt-1">
                  <Button
                    size="sm"
                    onClick={startUssdSession}
                    className="h-9 text-xs font-bold clay-button-primary rounded-xl w-full"
                  >
                    Redial *384*24#
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Session breadcrumb */}
          {ussdPath && (
            <div className="text-[10px] font-mono text-slate-500 truncate pt-1 border-t border-slate-800">
              Path: *384*24*{ussdPath}#
            </div>
          )}
        </div>

        {/* 3D Tactile Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 px-2 py-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((key) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => handleKeypadClick(key)}
              className="h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold text-lg flex items-center justify-center transition-all border border-slate-700/60 shadow-[0_4px_8px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] cursor-pointer"
            >
              {key}
            </motion.button>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between px-2 pt-3 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetSession}
            className="text-xs text-slate-400 hover:text-white h-9"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>

          {!isDialed ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startUssdSession}
              className="clay-button-emerald text-xs h-10 px-7 rounded-full font-bold flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <PhoneCall className="w-4 h-4" />
              Dial Code
            </motion.button>
          ) : (
            <Button
              onClick={handleResetSession}
              variant="outline"
              className="text-xs border-red-500/40 text-red-400 hover:bg-red-500/10 h-9 rounded-xl"
            >
              End Session
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
