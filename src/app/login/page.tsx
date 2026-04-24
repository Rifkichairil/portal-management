"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Sun } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Subtle Grid Background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none" 
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />
      
      <div className="w-full max-w-[440px] bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-12 z-10 relative border border-gray-100">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-3">
            <Sun className="w-10 h-10 text-[#d97d5e]" strokeWidth={1.5} />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-800">
            PORTAL
          </span>
        </div>

        {/* Header Strings */}
        <div className="flex flex-col items-center text-center justify-center mb-10">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            WELCOME TO PORTAL
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed px-2 text-center flex justify-center">
            Access your portal and manage cases efficiently with the Case Management system
          </p>
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* Email / Username */}
          <div className="space-y-2">
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
              Username or Email
            </label>
            <Input 
              id="identifier"
              type="text"
              placeholder="Enter Your Username or Email"
              className="rounded-full px-5 h-12 border-gray-200 focus-visible:ring-gray-300 text-sm placeholder:text-gray-400 bg-transparent transition-all"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Passwords
            </label>
            <div className="relative">
              <Input 
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter Your Passwords"
                className="rounded-full px-5 pr-12 h-12 border-gray-200 focus-visible:ring-gray-300 text-sm placeholder:text-gray-400 bg-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="flex justify-end pt-1 pb-2">
            <Link href="#" className="text-sm font-bold text-gray-900 hover:underline">
              Forgot Password?
            </Link>
          </div>

          {/* Login Button */}
          <Button 
            className="w-full rounded-full bg-black hover:bg-gray-800 text-white font-semibold h-12 text-base transition-colors"
          >
            Login
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          Don't have an Account ?{" "}
          <Link href="#" className="font-bold text-gray-900 hover:underline">
            Register
          </Link>
        </div>

      </div>
    </div>
  );
}
