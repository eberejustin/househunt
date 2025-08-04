import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import Map from "@/components/Map";
import Sidebar from "@/components/Sidebar";
import AddApartmentModal from "@/components/AddApartmentModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Plus, User, Users, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Home() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const typedUser = user as UserType;
  const userInitials = typedUser.firstName && typedUser.lastName 
    ? `${typedUser.firstName[0]}${typedUser.lastName[0]}` 
    : typedUser.email?.[0]?.toUpperCase() || "U";

  const displayName = typedUser.firstName && typedUser.lastName 
    ? `${typedUser.firstName} ${typedUser.lastName[0]}.` 
    : typedUser.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-neutral-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-neutral-900">HouseHunt</h1>
            </div>
            
            <div className="hidden md:flex items-center bg-neutral-100 rounded-lg px-3 py-2 w-80">
              <Search className="h-4 w-4 text-neutral-400 mr-2" />
              <Input
                type="text"
                placeholder="Search addresses or neighborhoods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none flex-1 text-sm p-0 focus-visible:ring-0"
                data-testid="input-search"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-primary hover:bg-blue-600"
              data-testid="button-add-apartment"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Apartment
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center space-x-2 bg-neutral-100 hover:bg-neutral-200"
                  data-testid="button-user-menu"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={typedUser.profileImageUrl || undefined} />
                    <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-neutral-700">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem data-testid="menu-profile">
                  <User className="h-4 w-4 mr-3" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-collaborators">
                  <Users className="h-4 w-4 mr-3" />
                  Collaborators
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => window.location.href = '/api/logout'}
                  data-testid="menu-logout"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Mobile search bar */}
        <div className="md:hidden px-4 pb-3">
          <div className="flex items-center bg-neutral-100 rounded-lg px-3 py-2">
            <Search className="h-4 w-4 text-neutral-400 mr-2" />
            <Input
              type="text"
              placeholder="Search addresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none flex-1 text-sm p-0 focus-visible:ring-0"
              data-testid="input-search-mobile"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        <Sidebar 
          selectedApartmentId={selectedApartmentId}
          onSelectApartment={setSelectedApartmentId}
          searchQuery={searchQuery}
        />
        
        <Map 
          selectedApartmentId={selectedApartmentId}
          onSelectApartment={setSelectedApartmentId}
          onAddApartment={() => setIsAddModalOpen(true)}
        />
      </div>

      {/* Add Apartment Modal */}
      <AddApartmentModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
