"use client";

import { useState, useCallback, useEffect, useMemo } from "react";

type EmergencyCategory = {
  id: string;
  label: string;
  icon: React.ReactNode;
  urgency: "critical" | "high" | "medium";
  description: string;
  selfHelp: string[];
  callActionType: "112" | "nhai" | "oem";
};

const EMERGENCY_CATEGORIES: EmergencyCategory[] = [
  {
    id: "battery_dead",
    label: "Battery Depleted",
    urgency: "high",
    description: "EV ran out of charge and is stranded on road",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="16" height="10" x="2" y="7" rx="2" ry="2" />
        <line x1="22" x2="22" y1="11" y2="13" />
        <line x1="6" x2="6" y1="11" y2="13" />
      </svg>
    ),
    selfHelp: [
      "Turn on hazard lights immediately",
      "Move to the shoulder if possible (use remaining momentum)",
      "Stay inside the vehicle if on a highway",
      "Call your EV manufacturer's roadside assistance",
      "A mobile charging van or flatbed tow can help",
    ],
    callActionType: "oem",
  },
  {
    id: "flat_tyre",
    label: "Flat Tyre",
    urgency: "medium",
    description: "Punctured or blown tyre — most EVs have no spare",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
        <line x1="12" x2="12" y1="2" y2="5" />
        <line x1="12" x2="12" y1="19" y2="22" />
        <line x1="2" x2="5" y1="12" y2="12" />
        <line x1="19" x2="22" y1="12" y2="12" />
      </svg>
    ),
    selfHelp: [
      "Pull over safely and turn on hazard lights",
      "Most EVs carry a tyre inflation kit — check your boot",
      "Do NOT attempt to drive on a flat — EVs are heavier",
      "Use the inflation kit for small punctures only",
      "For blowouts, call for a flatbed tow truck",
    ],
    callActionType: "oem",
  },
  {
    id: "door_lockout",
    label: "Door Lockout",
    urgency: "medium",
    description: "Locked out — 12V battery dead or key fob failure",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        <circle cx="12" cy="16" r="1" />
      </svg>
    ),
    selfHelp: [
      "Check if your manufacturer app can unlock remotely",
      "Some EVs have a physical key hidden in the fob — check manual",
      "A dead 12V battery can cause complete lockout",
      "Do NOT try to force open doors — high voltage systems nearby",
      "Call manufacturer roadside or a locksmith with EV experience",
    ],
    callActionType: "oem",
  },
  {
    id: "towing",
    label: "Towing Needed",
    urgency: "high",
    description: "Vehicle needs to be towed — FLATBED ONLY for EVs",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 17h4V5H2v12h3" />
        <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
        <circle cx="7.5" cy="17.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
      </svg>
    ),
    selfHelp: [
      "⚠ CRITICAL: EVs must be towed on a FLATBED only",
      "Never use hook-and-chain or dolly towing — damages motors",
      "Dragging an EV can destroy the electric drivetrain",
      "Tell the tow company it is an EV before they arrive",
      "If possible, put the vehicle in Transport mode (check manual)",
    ],
    callActionType: "nhai",
  },
  {
    id: "charging_stuck",
    label: "Charging Cable Stuck",
    urgency: "medium",
    description: "Connector won't release from the charging port",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    selfHelp: [
      "Stop the charge session from both the car and charger screens",
      "Wait 30 seconds then try the release button again",
      "Check if the cable release lock is engaged (door lock related)",
      "Try locking/unlocking the car — this resets the connector lock",
      "Most EVs have a manual cable release in the boot — check manual",
      "Do NOT force or yank the cable — can damage the port",
    ],
    callActionType: "oem",
  },
  {
    id: "accident",
    label: "Accident / Collision",
    urgency: "critical",
    description: "Vehicle involved in accident — high voltage safety",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" x2="12" y1="9" y2="13" />
        <line x1="12" x2="12.01" y1="17" y2="17" />
      </svg>
    ),
    selfHelp: [
      "Call 112 immediately — mention it's an ELECTRIC VEHICLE",
      "Do NOT touch any orange-colored cables (high voltage)",
      "Stay away from any fluid leaks under the car",
      "If safe, turn off the vehicle and remove the key/fob",
      "Warn rescue workers about high voltage battery system",
      "If you smell burning or see smoke, move 15+ meters away",
    ],
    callActionType: "112",
  },
  {
    id: "overheating",
    label: "Battery Overheating",
    urgency: "critical",
    description: "Warning lights for battery temperature or thermal event",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
      </svg>
    ),
    selfHelp: [
      "Stop the vehicle immediately in a safe, open area",
      "Turn off the car and move everyone 15+ meters away",
      "Do NOT open the bonnet or try to cool the battery",
      "Call 101/112 — EV battery fires require special equipment",
      "If smoke or flames appear, do NOT attempt to extinguish with water",
      "Battery thermal events can re-ignite — keep your distance",
    ],
    callActionType: "112",
  },
  {
    id: "12v_failure",
    label: "12V System Failure",
    urgency: "medium",
    description: "Auxiliary battery dead — screens/locks not responding",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18.36 6.64A9 9 0 0 1 20.77 15" />
        <path d="M6.16 6.16a9 9 0 1 0 12.68 12.68" />
        <path d="M12 2v4" />
        <path d="m2 2 20 20" />
      </svg>
    ),
    selfHelp: [
      "A dead 12V battery can make the EV completely unresponsive",
      "The main high-voltage battery may still be fine",
      "Some EVs can be jump-started with a standard 12V jumper",
      "Check your owner's manual for 12V battery location (often in boot)",
      "Contact roadside assistance for a 12V jump or replacement",
    ],
    callActionType: "oem",
  },
];

const OEM_HELPLINES = [
  { brand: "Tata EV", match: "tata", number: "18002097979", display: "1800-209-7979" },
  { brand: "MG Motor", match: "mg", number: "18003157777", display: "1800-315-7777" },
  { brand: "Hyundai", match: "hyundai", number: "1800114645", display: "1800-11-4645" },
  { brand: "BYD India", match: "byd", number: "18001021201", display: "1800-102-1201" },
  { brand: "Mahindra", match: "mahindra", number: "18002667070", display: "1800-266-7070" },
];

const QUICK_CONTACTS = [
  { label: "Emergency", number: "112", color: "text-red-600 bg-red-50 border-red-100" },
  { label: "Highway Assist", number: "1033", color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
  { label: "Police", number: "100", color: "text-blue-600 bg-blue-50 border-blue-100" },
  { label: "Ambulance", number: "108", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
];

export function EmergencyPanel({ selectedVehicleId }: { selectedVehicleId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<EmergencyCategory | null>(null);
  
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"loading" | "success" | "error" | "idle">("idle");

  // Determine OEM based on selected vehicle
  const oem = useMemo(() => {
    if (!selectedVehicleId) return null;
    return OEM_HELPLINES.find((h) => selectedVehicleId.toLowerCase().includes(h.match)) || null;
  }, [selectedVehicleId]);

  // Request GPS when opened
  useEffect(() => {
    if (isOpen && locationStatus === "idle") {
      setLocationStatus("loading");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationStatus("success");
        },
        (err) => {
          console.warn("GPS failed", err);
          setLocationStatus("error");
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [isOpen, locationStatus]);

  const handleBack = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSelectedCategory(null);
  }, []);

  const urgencyBadge = {
    critical: "bg-red-50 text-red-700 border-red-200",
    high: "bg-amber-50 text-amber-700 border-amber-200",
    medium: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const generateWhatsAppLink = () => {
    const text = [
      "🚨 *EV ROADSIDE EMERGENCY*",
      oem ? `Vehicle: ${oem.brand}` : "",
      selectedCategory ? `Issue: ${selectedCategory.label}` : "",
      location ? `Location: https://maps.google.com/?q=${location.lat},${location.lng}` : "Location: Unknown",
      "Please dispatch assistance."
    ].filter(Boolean).join("%0A");
    return `https://wa.me/?text=${text}`;
  };

  // Sleek Floating Button (Matching UI)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-full bg-white text-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2"
        aria-label="Emergency Assistance"
      >
        <div className="flex items-center justify-center bg-red-50 text-red-600 rounded-full w-6 h-6">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v20" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <span className="text-sm font-semibold pr-1">Emergency SOS</span>
      </button>
    );
  }

  // Refined Slide-Over Panel (Matches TripControls/TripSummary UI)
  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      />
      
      <div className="fixed bottom-6 right-6 z-50 w-full max-w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[85vh] max-h-[720px] animate-in slide-in-from-bottom-8 fade-in duration-300">
        
        {/* Clean Header */}
        <div className="bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {selectedCategory ? (
              <button
                onClick={handleBack}
                className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
            ) : (
              <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" x2="12" y1="9" y2="13" />
                  <line x1="12" x2="12.01" y1="17" y2="17" />
                </svg>
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-slate-950 leading-tight">
                {selectedCategory
                  ? selectedCategory.label
                  : "Emergency Assistance"}
              </h2>
              {!selectedCategory && (
                <p className="text-slate-500 text-xs mt-0.5">
                  Find help and self-recovery steps
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {!selectedCategory ? (
            <>
              {/* GPS & WhatsApp Share Section */}
              <div className="px-5 pt-4">
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">Your Location</p>
                      {locationStatus === "loading" && <p className="text-[11px] text-slate-500">Acquiring GPS...</p>}
                      {locationStatus === "error" && <p className="text-[11px] text-red-500">Location unavailable</p>}
                      {locationStatus === "success" && location && (
                        <p className="text-[11px] text-slate-500 font-mono">
                          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                        </p>
                      )}
                    </div>
                  </div>
                  <a
                    href={generateWhatsAppLink()}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Share
                  </a>
                </div>
              </div>

              {/* Quick Dial Grid */}
              <div className="px-5 pt-4 pb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                  Quick Dial
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_CONTACTS.map((contact) => (
                    <a
                      key={contact.number}
                      href={`tel:${contact.number}`}
                      className={`border ${contact.color} rounded-xl p-3 flex items-center justify-between hover:opacity-80 transition-opacity active:scale-95`}
                    >
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wide">
                          {contact.label}
                        </span>
                        <span className="block text-sm font-semibold opacity-90 mt-0.5">
                          {contact.number}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Troubleshooting Categories */}
              <div className="px-5 pt-3 pb-6">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                  Troubleshooting Guide
                </p>
                <div className="space-y-2">
                  {EMERGENCY_CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category)}
                      className="w-full text-left p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all flex items-center gap-3 group"
                    >
                      <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
                        {category.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-900">
                          {category.label}
                        </span>
                        <span className="block text-xs text-slate-500 mt-0.5 truncate">
                          {category.description}
                        </span>
                      </div>
                      <svg
                        className="text-slate-300 group-hover:text-slate-400"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Selected Category Detail */
            <div className="px-5 py-5 space-y-6">
              {/* Alert Banner */}
              <div className={`px-4 py-3 rounded-xl border flex items-start gap-3 ${urgencyBadge[selectedCategory.urgency]}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-xs font-medium leading-relaxed">
                  {selectedCategory.description}
                </p>
              </div>

              {/* Steps */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  Recommended Actions
                </p>
                <ol className="space-y-4">
                  {selectedCategory.selfHelp.map((step, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className={`text-sm leading-relaxed ${step.startsWith("⚠") ? "font-semibold text-red-600" : "text-slate-700"}`}>
                        {step.replace("⚠ CRITICAL:", "")}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Dynamic Call to Action Button */}
              {(() => {
                let callNumber = "112";
                let callLabel = "Call Emergency 112";
                let bgColor = "bg-red-600 hover:bg-red-700";
                
                if (selectedCategory.callActionType === "nhai") {
                  callNumber = "1033";
                  callLabel = "Call NHAI Highway Assist (1033)";
                  bgColor = "bg-indigo-600 hover:bg-indigo-700";
                } else if (selectedCategory.callActionType === "oem") {
                  if (oem) {
                    callNumber = oem.number;
                    callLabel = `Call ${oem.brand} Roadside`;
                    bgColor = "bg-slate-900 hover:bg-slate-800";
                  } else {
                    callNumber = ""; // No OEM known, we skip the big button or fallback
                  }
                }

                if (!callNumber) return null;

                return (
                  <a
                    href={`tel:${callNumber}`}
                    className={`flex items-center justify-center gap-2 w-full py-3 ${bgColor} text-white font-medium rounded-xl transition-all text-sm shadow-sm`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    {callLabel}
                  </a>
                );
              })()}

              {/* Share Location to WhatsApp */}
              <a
                href={generateWhatsAppLink()}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-all text-sm shadow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Share GPS Location via WhatsApp
              </a>

              {/* Helplines List (Always visible as fallback) */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Manufacturer RSA Helplines
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {OEM_HELPLINES.map((mfr) => {
                    const isSelected = oem?.brand === mfr.brand;
                    return (
                      <a
                        key={mfr.brand}
                        href={`tel:${mfr.number}`}
                        className={`block p-2.5 rounded-lg border transition-colors ${
                          isSelected 
                            ? "border-emerald-500 bg-emerald-50 shadow-sm" 
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <p className={`text-xs font-semibold ${isSelected ? "text-emerald-900" : "text-slate-900"}`}>
                            {mfr.brand}
                          </p>
                          {isSelected && (
                            <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-bold">YOURS</span>
                          )}
                        </div>
                        <p className={`text-[10px] mt-0.5 font-medium ${isSelected ? "text-emerald-700" : "text-slate-500"}`}>
                          {mfr.display}
                        </p>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
