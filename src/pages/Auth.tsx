import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';
import { Eye, EyeOff, ChevronLeft, ChevronRight, Mail, Lock, ArrowRight } from 'lucide-react';

// Testimonial data for slideshow
const testimonials = [
  {
    id: 1,
    name: "Liam Smith",
    role: "Investor",
    company: "Global Real Estate Investment Firm",
    quote: "With AI Studio, I can manage my global property portfolio and complete secure transactions in minutes — all with AI. It's the perfect blend of real estate and AI innovation.",
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&crop=center"
  },
  {
    id: 2,
    name: "Sarah Johnson",
    role: "Creative Director",
    company: "Digital Marketing Agency",
    quote: "AI Studio has revolutionized how we create and manage content. The AI-powered prompts have increased our productivity by 300% while maintaining exceptional quality.",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c2039ab?w=800&h=600&fit=crop&crop=center"
  },
  {
    id: 3,
    name: "Michael Chen",
    role: "Tech Entrepreneur",
    company: "AI Startup Inc.",
    quote: "The prompt library is incredibly comprehensive. We've integrated it into our workflow and it's become an essential tool for our AI development process.",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop&crop=center"
  },
  {
    id: 4,
    name: "Emily Rodriguez",
    role: "Content Creator",
    company: "Freelance Writer",
    quote: "As a content creator, AI Studio has been a game-changer. The variety of prompts and the quality of outputs have helped me scale my business significantly.",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop&crop=center"
  },
];

const Auth = () => {
  const { user, signIn, signUp, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { toast } = useToast();

  // Auto-advance slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  // Redirect if already authenticated
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });
    }

    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    const { error } = await signUp(email, password, fullName);

    if (error) {
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Account created!',
        description: 'Please check your email to verify your account.',
      });
    }

    setIsLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative">
        {/* Subtle Texture Overlay */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-500/10 to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(137, 49, 219, 0.41)_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(123, 27, 211, 0.6)_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(146, 51, 234, 0.4)_0%,transparent_70%)]"></div>
          {/* Center Bright Effect */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(230, 143, 252, 0.6)_0%,rgba(147,51,234,0.06)_30%,transparent_60%)]"></div>
        </div>
        
        {/* Frozen Ice Crystals Effect */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-300/50 rounded-full blur-sm animate-pulse"></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-purple-400/60 rounded-full blur-sm animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/3 w-1.5 h-1.5 bg-purple-300/40 rounded-full blur-sm animate-pulse delay-2000"></div>
          <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-purple-400/50 rounded-full blur-sm animate-pulse delay-500"></div>
          <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-purple-300/45 rounded-full blur-sm animate-pulse delay-1500"></div>
        </div>
        <div className="text-center relative z-10">
          <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-purple-400"></div>
          <p className="mt-4 text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  const currentTestimonial = testimonials[currentSlide];

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative">
      {/* Subtle Texture Overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-500/15 to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(147,51,234,0.20)_0%,transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(147,51,234,0.15)_0%,transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(147,51,234,0.12)_0%,transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_90%,rgba(147,51,234,0.10)_0%,transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(147,51,234,0.13)_0%,transparent_60%)]"></div>
        {/* Center Bright Effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,rgba(147,51,234,0.08)_30%,transparent_60%)]"></div>
      </div>
      
      {/* Frozen Ice Crystals Effect */}
      <div className="absolute inset-0 opacity-45">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-300/50 rounded-full blur-sm animate-pulse"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-purple-400/60 rounded-full blur-sm animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/3 w-1.5 h-1.5 bg-purple-300/40 rounded-full blur-sm animate-pulse delay-2000"></div>
        <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-purple-400/50 rounded-full blur-sm animate-pulse delay-500"></div>
        <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-purple-300/45 rounded-full blur-sm animate-pulse delay-1500"></div>
        <div className="absolute top-1/5 right-1/5 w-1 h-1 bg-purple-400/55 rounded-full blur-sm animate-pulse delay-3000"></div>
        <div className="absolute bottom-1/5 left-1/5 w-1.5 h-1.5 bg-purple-300/40 rounded-full blur-sm animate-pulse delay-2500"></div>
        <div className="absolute top-2/3 left-1/5 w-1 h-1 bg-purple-400/50 rounded-full blur-sm animate-pulse delay-3500"></div>
        <div className="absolute bottom-2/3 right-1/5 w-2 h-2 bg-purple-300/45 rounded-full blur-sm animate-pulse delay-4000"></div>
      </div>
      
      {/* Floating Container */}
      <div className="w-full max-w-5xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl overflow-hidden relative z-10">
        <div className="flex min-h-[500px] lg:min-h-[550px]">
          {/* Left Section - Login Form */}
          <div className="flex-1 flex items-center justify-center p-6 lg:p-8">
            <div className="w-full max-w-sm">
              <div className="space-y-6">
              {/* Header Tabs */}
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/10">
                  <TabsTrigger 
                    value="login" 
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-sm"
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    Login
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-sm"
                  >
                    <ArrowRight className="w-3 h-3 mr-1" />
                    Sign Up
                  </TabsTrigger>
            </TabsList>
            
                {/* Welcome Message */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-white mb-1">Welcome!</h1>
                  <p className="text-slate-300 text-sm">Please enter your details to login.</p>
                </div>

                {/* Login Form */}
                <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="login-email" className="text-white font-medium text-sm">
                        Email address
                      </Label>
                  <Input
                        id="login-email"
                    name="email"
                    type="email"
                        placeholder="Enter your email address"
                        className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-purple-400 focus:ring-purple-400 text-sm py-2"
                    required
                  />
                </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password" className="text-white font-medium text-sm">
                          Password
                        </Label>
                        <button
                          type="button"
                          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                  <Input
                          id="login-password"
                    name="password"
                          type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                          className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-purple-400 focus:ring-purple-400 pr-10 text-sm py-2"
                    required
                  />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-medium py-2.5 rounded-lg transition-all duration-300 transform hover:scale-105 text-sm shadow-lg shadow-purple-500/25"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Signing in...' : 'Log In'}
                </Button>
              </form>
            </TabsContent>
            
                {/* Sign Up Form */}
                <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="signup-name" className="text-white font-medium text-sm">
                        Full Name
                      </Label>
                  <Input
                    id="signup-name"
                    name="fullName"
                    type="text"
                    placeholder="Enter your full name"
                        className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-purple-400 focus:ring-purple-400 text-sm py-2"
                    required
                  />
                </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="signup-email" className="text-white font-medium text-sm">
                        Email address
                      </Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                        placeholder="Enter your email address"
                        className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-purple-400 focus:ring-purple-400 text-sm py-2"
                    required
                  />
                </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="signup-password" className="text-white font-medium text-sm">
                        Password
                      </Label>
                      <div className="relative">
                  <Input
                    id="signup-password"
                    name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-purple-400 focus:ring-purple-400 pr-10 text-sm py-2"
                    required
                    minLength={6}
                  />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-medium py-2.5 rounded-lg transition-all duration-300 transform hover:scale-105 text-sm shadow-lg shadow-purple-500/25"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating account...' : 'Sign Up'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              {/* OR Separator */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-slate-800 text-slate-300">OR</span>
                </div>
              </div>

              {/* Social Login Buttons */}
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-300 text-sm py-2"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
              </div>

              {/* Sign Up Link */}
              <div className="text-center mt-4">
                <span className="text-slate-300 text-sm">Don't have an account yet? </span>
                <button className="text-purple-400 hover:text-purple-300 font-medium transition-colors text-sm">
                  Sign up
                </button>
              </div>
              </div>
            </div>
          </div>

          {/* Right Section - Image Slideshow with Testimonial */}
          <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
          style={{ backgroundImage: `url(${currentTestimonial.image})` }}
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Navigation Controls */}
        <div className="absolute bottom-8 right-8 z-10">
          <div className="flex space-x-2">
            <button
              onClick={prevSlide}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all duration-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextSlide}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all duration-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="absolute top-8 right-8 z-10">
          <div className="flex space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'bg-purple-400 w-8' 
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
          </div>
        </div>
      </div>

      {/* Mobile Version - Full Screen */}
      <div className="lg:hidden fixed inset-0 bg-black">
        {/* Mobile Subtle Texture Overlay */}
        <div className="absolute inset-0 opacity-18 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-500/12 to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(147,51,234,0.18)_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(147,51,234,0.14)_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(147,51,234,0.10)_0%,transparent_70%)]"></div>
          {/* Center Bright Effect */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.025)_0%,rgba(147,51,234,0.07)_30%,transparent_60%)]"></div>
        </div>
        
        {/* Mobile Frozen Ice Crystals Effect */}
        <div className="absolute inset-0 opacity-40 z-0">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-300/50 rounded-full blur-sm animate-pulse"></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-purple-400/60 rounded-full blur-sm animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/3 w-1.5 h-1.5 bg-purple-300/40 rounded-full blur-sm animate-pulse delay-2000"></div>
          <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-purple-400/50 rounded-full blur-sm animate-pulse delay-500"></div>
          <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-purple-300/45 rounded-full blur-sm animate-pulse delay-1500"></div>
          <div className="absolute top-1/5 right-1/5 w-1 h-1 bg-purple-400/55 rounded-full blur-sm animate-pulse delay-3000"></div>
        </div>
        
        {/* Mobile Slideshow Background */}
        <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
          style={{ backgroundImage: `url(${currentTestimonial.image})` }}
        />
        <div className="absolute inset-0 bg-black/60" />
        
        {/* Mobile Navigation Controls */}
        <div className="absolute bottom-4 right-4 z-10">
          <div className="flex space-x-1">
            <button
              onClick={prevSlide}
              className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all duration-300"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              onClick={nextSlide}
              className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all duration-300"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Mobile Slide Indicators */}
        <div className="absolute top-4 right-4 z-10">
          <div className="flex space-x-1">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'bg-purple-400 w-6' 
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

        {/* Mobile Form Overlay */}
        <div className="relative z-10 flex items-center justify-center p-4 h-full">
          <div className="w-full max-w-xs">
            <div className="bg-white/10 backdrop-blur-md border-white/20 shadow-2xl rounded-xl p-4">
              {/* Mobile Header Tabs */}
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 bg-white/10">
                  <TabsTrigger 
                    value="login" 
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-xs"
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    Login
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-xs"
                  >
                    <ArrowRight className="w-3 h-3 mr-1" />
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                {/* Mobile Welcome Message */}
                <div className="text-center mb-4">
                  <h1 className="text-xl font-bold text-white mb-1">Welcome!</h1>
                  <p className="text-slate-300 text-xs">Please enter your details to login.</p>
                </div>

                {/* Mobile Login Form */}
                <TabsContent value="login">
                  <form onSubmit={handleSignIn} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="mobile-login-email" className="text-white font-medium text-sm">
                        Email address
                      </Label>
                      <Input
                        id="mobile-login-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email address"
                        className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-purple-400 focus:ring-purple-400 text-sm"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="mobile-login-password" className="text-white font-medium text-sm">
                          Password
                        </Label>
                        <button
                          type="button"
                          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="mobile-login-password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-purple-400 focus:ring-purple-400 pr-10 text-sm"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-medium py-2.5 rounded-lg transition-all duration-300 transform hover:scale-105 text-sm shadow-lg shadow-purple-500/25"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Signing in...' : 'Log In'}
                    </Button>
                  </form>
                </TabsContent>

                {/* Mobile Sign Up Form */}
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="mobile-signup-name" className="text-white font-medium text-sm">
                        Full Name
                      </Label>
                      <Input
                        id="mobile-signup-name"
                        name="fullName"
                        type="text"
                        placeholder="Enter your full name"
                        className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-purple-400 focus:ring-purple-400 text-sm"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="mobile-signup-email" className="text-white font-medium text-sm">
                        Email address
                      </Label>
                      <Input
                        id="mobile-signup-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email address"
                        className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-purple-400 focus:ring-purple-400 text-sm"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="mobile-signup-password" className="text-white font-medium text-sm">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="mobile-signup-password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-purple-400 focus:ring-purple-400 pr-10 text-sm"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-medium py-2.5 rounded-lg transition-all duration-300 transform hover:scale-105 text-sm shadow-lg shadow-purple-500/25"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating account...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

              {/* Mobile OR Separator */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-slate-800 text-slate-300">OR</span>
                </div>
              </div>

              {/* Mobile Social Login Buttons */}
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-300 text-xs py-2"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
              </div>

              {/* Mobile Sign Up Link */}
              <div className="text-center mt-4">
                <span className="text-slate-300 text-xs">Don't have an account yet? </span>
                <button className="text-purple-400 hover:text-purple-300 font-medium transition-colors text-xs">
                  Sign up
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Auth;