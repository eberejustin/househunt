import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType, ApartmentWithDetails } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import SimpleMap from "@/components/SimpleMap";
import Sidebar from "@/components/Sidebar";
import AddApartmentModal from "@/components/AddApartmentModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Search,
  Plus,
  User,
  Users,
  LogOut,
  Map,
  List,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
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
  const [editingApartment, setEditingApartment] =
    useState<ApartmentWithDetails | null>(null);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "map">("list"); // Default to list on mobile

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
  const userInitials =
    typedUser.firstName && typedUser.lastName
      ? `${typedUser.firstName[0]}${typedUser.lastName[0]}`
      : typedUser.email?.[0]?.toUpperCase() || "U";

  const displayName =
    typedUser.firstName && typedUser.lastName
      ? `${typedUser.firstName} ${typedUser.lastName[0]}.`
      : typedUser.email?.split("@")[0] || "User";

  // Handle apartment selection with mobile navigation
  const handleApartmentSelect = (id: string | null) => {
    setSelectedApartmentId(id);
    // On mobile, when selecting an apartment, show the list view (detail view)
    if (id && window.innerWidth < 768) {
      setMobileView("list");
    }
  };

  // Handle map marker click - should focus apartment and show list view on mobile
  const handleMapMarkerClick = (apartmentId: string | null) => {
    setSelectedApartmentId(apartmentId);
    if (apartmentId && window.innerWidth < 768) {
      setMobileView("list");
    }
  };

  // Handle back button - should return to map on mobile
  const handleBackToMap = () => {
    if (window.innerWidth < 768) {
      setMobileView("map");
      setSelectedApartmentId(null);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-neutral-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <span className="text-2xl">🏠</span>
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
            {/* Mobile View Toggle */}
            <div className="md:hidden flex items-center space-x-1">
              <Button
                variant={mobileView === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setMobileView("list")}
                data-testid="button-mobile-list-view"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={mobileView === "map" ? "default" : "outline"}
                size="sm"
                onClick={() => setMobileView("map")}
                data-testid="button-mobile-map-view"
              >
                <Map className="h-4 w-4" />
              </Button>
            </div>

            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="p-0 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
                  data-testid="button-user-menu"
                >
                  <span className="text-sm font-medium text-neutral-700">
                    {typedUser?.firstName?.[0] || typedUser?.lastName?.[0] || 'U'}
                  </span>
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
                  onClick={() => (window.location.href = "/api/logout")}
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
      <div className="flex h-[calc(100vh-64px)]">
        {/* Desktop: Always show sidebar */}
        {/* Mobile: Show sidebar only when mobileView === 'list' */}
        <div
          className={`${mobileView === "list" ? "w-full" : "hidden"} md:block md:w-auto`}
        >
          <Sidebar
            selectedApartmentId={selectedApartmentId}
            onSelectApartment={handleApartmentSelect}
            onEditApartment={setEditingApartment}
            searchQuery={searchQuery}
            onBackToMap={handleBackToMap}
          />
        </div>

        {/* Desktop: Always show map */}
        {/* Mobile: Show map only when mobileView === 'map' */}
        <div
          className={`${mobileView === "map" ? "w-full" : "hidden"} md:block md:flex-1`}
        >
          <SimpleMap
            selectedApartmentId={selectedApartmentId}
            onSelectApartment={handleMapMarkerClick}
            onAddApartment={() => setIsAddModalOpen(true)}
            isVisible={mobileView === "map" || window.innerWidth >= 768}
          />
        </div>
      </div>

      {/* Floating Add Button */}
      <Button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary hover:bg-blue-600 shadow-lg z-40 p-0 flex items-center justify-center"
        data-testid="button-floating-add-apartment"
      >
        <Plus className="h-6 w-6 text-white" />
      </Button>

      {/* Add/Edit Apartment Modal */}
      <AddApartmentModal
        isOpen={isAddModalOpen || !!editingApartment}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingApartment(null);
        }}
        editingApartment={editingApartment}
      />
    </div>
  );
}
