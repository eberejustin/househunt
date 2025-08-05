import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Heart, MessageCircle, X, Send, Edit3, ExternalLink } from "lucide-react";
import type { ApartmentWithDetails, CommentWithUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatDistanceToNow } from "date-fns";

interface SidebarProps {
  selectedApartmentId: string | null;
  onSelectApartment: (id: string | null) => void;
  onEditApartment: (apartment: ApartmentWithDetails) => void;
  searchQuery: string;
}

export default function Sidebar({ selectedApartmentId, onSelectApartment, onEditApartment, searchQuery }: SidebarProps) {
  const [filter, setFilter] = useState<'all' | 'favorites' | 'active'>('all');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [bedroomFilter, setBedroomFilter] = useState<string>('all');
  const [newComment, setNewComment] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: apartments, isLoading: apartmentsLoading, error: apartmentsError } = useQuery({
    queryKey: ['/api/apartments'],
    retry: false,
  });

  const apartmentsArray = apartments as ApartmentWithDetails[] || [];

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['/api/apartments', selectedApartmentId, 'comments'],
    enabled: !!selectedApartmentId,
    retry: false,
  });

  const selectedApartment = useMemo(() => {
    if (!selectedApartmentId || !apartmentsArray) return null;
    return apartmentsArray.find((apt: ApartmentWithDetails) => apt.id === selectedApartmentId);
  }, [selectedApartmentId, apartmentsArray]);

  const filteredApartments = useMemo(() => {
    if (!apartmentsArray) return [];
    
    let filtered = apartmentsArray.filter((apt: ApartmentWithDetails) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!apt.label.toLowerCase().includes(query) && 
            !apt.address.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Type filter
      if (filter === 'favorites' && !apt.isFavorited) return false;
      if (filter === 'active' && apt.commentCount === 0) return false;
      
      return true;
    });
    
    return filtered;
  }, [apartmentsArray, searchQuery, filter]);

  // Handle unauthorized errors
  if (apartmentsError && isUnauthorizedError(apartmentsError)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (apartmentId: string) => {
      await apiRequest('POST', `/api/apartments/${apartmentId}/favorite`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/apartments'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update favorite",
        variant: "destructive",
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ apartmentId, text }: { apartmentId: string; text: string }) => {
      await apiRequest('POST', `/api/apartments/${apartmentId}/comments`, { text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/apartments', selectedApartmentId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/apartments'] });
      setNewComment('');
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApartmentId || !newComment.trim()) return;
    
    addCommentMutation.mutate({
      apartmentId: selectedApartmentId,
      text: newComment.trim(),
    });
  };

  const favoriteCount = apartmentsArray?.filter((apt: ApartmentWithDetails) => apt.isFavorited).length || 0;
  const activeCount = apartmentsArray?.filter((apt: ApartmentWithDetails) => apt.commentCount > 0).length || 0;

  return (
    <div className="w-full md:w-96 bg-white border-r border-neutral-200 h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] overflow-y-auto">
      {/* Filter Controls */}
      <div className="p-4 border-b border-neutral-200 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">Apartments</h2>
          <Badge variant="secondary" data-testid="text-apartment-count">
            {filteredApartments.length} found
          </Badge>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="flex-1"
            data-testid="button-filter-all"
          >
            All ({apartmentsArray?.length || 0})
          </Button>
          <Button
            variant={filter === 'favorites' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('favorites')}
            className="flex-1"
            data-testid="button-filter-favorites"
          >
            Favorites ({favoriteCount})
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
            className="flex-1"
            data-testid="button-filter-active"
          >
            Active ({activeCount})
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Select value={priceRange} onValueChange={setPriceRange}>
            <SelectTrigger className="text-xs" data-testid="select-price-range">
              <SelectValue placeholder="Price Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prices</SelectItem>
              <SelectItem value="1000-1500">$1000-1500</SelectItem>
              <SelectItem value="1500-2000">$1500-2000</SelectItem>
              <SelectItem value="2000+">$2000+</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={bedroomFilter} onValueChange={setBedroomFilter}>
            <SelectTrigger className="text-xs" data-testid="select-bedrooms">
              <SelectValue placeholder="Bedrooms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bedrooms</SelectItem>
              <SelectItem value="studio">Studio</SelectItem>
              <SelectItem value="1br">1BR</SelectItem>
              <SelectItem value="2br+">2BR+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Apartment List */}
      <div className="divide-y divide-neutral-200">
        {apartmentsLoading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-neutral-600">Loading apartments...</p>
          </div>
        ) : filteredApartments.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-neutral-600">No apartments found</p>
          </div>
        ) : (
          filteredApartments.map((apartment: ApartmentWithDetails) => (
            <div
              key={apartment.id}
              className={`p-4 hover:bg-neutral-50 cursor-pointer transition-colors ${
                selectedApartmentId === apartment.id ? 'bg-primary/5 border-l-4 border-primary' : ''
              }`}
              onClick={() => onSelectApartment(apartment.id)}
              data-testid={`apartment-item-${apartment.id}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-neutral-900 text-sm" data-testid={`text-apartment-label-${apartment.id}`}>
                    {apartment.label}
                  </h3>
                  <p className="text-xs text-neutral-600 mt-1" data-testid={`text-apartment-address-${apartment.id}`}>
                    {apartment.address}
                  </p>
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavoriteMutation.mutate(apartment.id);
                    }}
                    data-testid={`button-favorite-${apartment.id}`}
                  >
                    <Heart 
                      className={`h-3 w-3 ${apartment.isFavorited ? 'fill-red-500 text-red-500' : 'text-neutral-400'}`} 
                    />
                  </Button>
                  <div className="flex items-center text-xs text-accent">
                    <MessageCircle className="h-3 w-3 mr-1" />
                    <span data-testid={`text-comment-count-${apartment.id}`}>{apartment.commentCount}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <span className="font-semibold text-primary" data-testid={`text-apartment-rent-${apartment.id}`}>
                    {apartment.rent || 'N/A'}
                  </span>
                  <span className="text-neutral-500" data-testid={`text-apartment-bedrooms-${apartment.id}`}>
                    {apartment.bedrooms || 'N/A'}
                  </span>
                </div>
                <span className="text-neutral-400" data-testid={`text-apartment-updated-${apartment.id}`}>
                  {formatDistanceToNow(new Date(apartment.updatedAt || apartment.createdAt!), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Selected Apartment Details */}
      {selectedApartment && (
        <div className="border-t border-neutral-200 bg-neutral-50 p-4" data-testid="apartment-details">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-neutral-900" data-testid="text-selected-apartment-label">
              {selectedApartment.label}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectApartment(null)}
              className="p-1 h-auto"
              data-testid="button-close-details"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-neutral-600">Address:</span>
              <span className="font-medium" data-testid="text-selected-apartment-address">
                {selectedApartment.address}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Rent:</span>
              <span className="font-medium text-primary" data-testid="text-selected-apartment-rent">
                {selectedApartment.rent || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Details:</span>
              <span className="font-medium" data-testid="text-selected-apartment-bedrooms">
                {selectedApartment.bedrooms || 'N/A'}
              </span>
            </div>
            {selectedApartment.listingLink && (
              <div className="flex justify-between">
                <span className="text-neutral-600">Listing:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto text-xs text-blue-600 hover:text-blue-800"
                  onClick={() => window.open(selectedApartment.listingLink!, '_blank')}
                  data-testid="button-listing-link"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Listing
                </Button>
              </div>
            )}
            {selectedApartment.notes && (
              <div className="pt-2">
                <span className="text-neutral-600 block mb-1">Notes:</span>
                <p className="text-xs text-neutral-700 bg-white p-2 rounded" data-testid="text-selected-apartment-notes">
                  {selectedApartment.notes}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditApartment(selectedApartment)}
              className="flex-1"
              data-testid="button-edit-apartment"
            >
              <Edit3 className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavoriteMutation.mutate(selectedApartment.id);
              }}
              className="p-2"
              data-testid="button-favorite-selected"
            >
              <Heart 
                className={`h-4 w-4 ${selectedApartment.isFavorited ? 'fill-red-500 text-red-500' : 'text-neutral-400'}`} 
              />
            </Button>
          </div>
          
          <Separator className="my-4" />
          
          {/* Discussion Thread */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-neutral-900">Discussion</h4>
              <Badge variant="outline" data-testid="text-selected-apartment-comment-count">
                {selectedApartment.commentCount} comments
              </Badge>
            </div>
            
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto" data-testid="comment-thread">
              {commentsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : comments && (comments as CommentWithUser[]).length > 0 ? (
                (comments as CommentWithUser[]).map((comment: CommentWithUser) => (
                  <div key={comment.id} className="flex space-x-2" data-testid={`comment-${comment.id}`}>
                    <Avatar className="w-6 h-6 flex-shrink-0">
                      <AvatarImage src={comment.user.profileImageUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {comment.user.firstName?.[0] || comment.user.lastName?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Card className="p-2">
                        <CardContent className="p-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-neutral-900 text-xs" data-testid={`comment-author-${comment.id}`}>
                              {comment.user.firstName && comment.user.lastName 
                                ? `${comment.user.firstName} ${comment.user.lastName[0]}.`
                                : 'User'
                              }
                            </span>
                            <span className="text-neutral-500 text-xs" data-testid={`comment-time-${comment.id}`}>
                              {formatDistanceToNow(new Date(comment.createdAt!), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-neutral-700 text-xs" data-testid={`comment-text-${comment.id}`}>
                            {comment.text}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-500 text-center py-4">No comments yet</p>
              )}
            </div>
            
            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="text-xs resize-none"
                rows={2}
                data-testid="textarea-new-comment"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleAddComment(e);
                  }
                }}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  data-testid="button-post-comment"
                >
                  {addCommentMutation.isPending ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                  ) : (
                    <Send className="h-3 w-3 mr-2" />
                  )}
                  Post
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
