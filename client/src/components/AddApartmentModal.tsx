import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertApartmentSchema, type ApartmentWithDetails } from "@shared/schema";
import { Autocomplete } from "@/components/ui/autocomplete";
import { createDebouncedSearch, type AddressSuggestion } from "@/lib/geocoding";
import { ChevronDown } from "lucide-react";

interface AddApartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingApartment?: ApartmentWithDetails | null;
}

const formSchema = z.object({
  address: z.string().min(1, "Address is required"),
  label: z.string().min(1, "Label is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  rent: z.string().optional(),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  listingLink: z.string().url().optional().or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

export default function AddApartmentModal({
  isOpen,
  onClose,
  editingApartment,
}: AddApartmentModalProps) {
  const [isManualGeocoding, setIsManualGeocoding] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const debouncedSearch = createDebouncedSearch();
  const modalContentRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      address: "",
      latitude: 40.7128,
      longitude: -74.0060,
      rent: "",
      bedrooms: "",
      bathrooms: "",
      status: "",
      notes: "",
      listingLink: "",
    }
  });

  // Reset form when editingApartment changes
  useEffect(() => {
    if (editingApartment) {
      form.reset({
        label: editingApartment.label,
        address: editingApartment.address,
        latitude: editingApartment.latitude,
        longitude: editingApartment.longitude,
        rent: editingApartment.rent || "",
        bedrooms: editingApartment.bedrooms || "",
        bathrooms: editingApartment.bathrooms || "",
        status: editingApartment.status || "",
        notes: editingApartment.notes || "",
        listingLink: editingApartment.listingLink || "",
      });
    } else {
      form.reset({
        label: "",
        address: "",
        latitude: 40.7128,
        longitude: -74.0060,
        rent: "",
        bedrooms: "",
        bathrooms: "",
        status: "",
        notes: "",
        listingLink: "",
      });
    }
  }, [editingApartment, form]);

  // Handle address selection from autocomplete
  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    form.setValue('address', suggestion.displayName);
    form.setValue('label', suggestion.customLabel);
    form.setValue('latitude', suggestion.coordinates.lat);
    form.setValue('longitude', suggestion.coordinates.lng);
  };

  // Manual geocoding fallback
  const geocodeAddressManually = async (address: string) => {
    if (!address.trim()) return;

    setIsManualGeocoding(true);
    try {
      const params = new URLSearchParams({
        format: 'json',
        addressdetails: '1',
        limit: '1',
        q: address.trim(),
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            'User-Agent': 'HouseHunt-App/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const results = await response.json();
      
      if (results && results.length > 0) {
        const result = results[0];
        form.setValue('latitude', parseFloat(result.lat));
        form.setValue('longitude', parseFloat(result.lon));
        
        // Also try to generate a better label if possible
        if (result.address && !editingApartment) {
          const houseNumber = result.address.house_number || '';
          const road = result.address.road || '';
          if (houseNumber && road) {
            form.setValue('label', `${houseNumber} ${road}`);
          }
        }
        
        toast({
          title: "Address found",
          description: "Coordinates updated successfully!",
        });
      } else {
        toast({
          title: "Address not found",
          description: "Please check the address or enter coordinates manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Geocoding error",
        description: "Failed to find address coordinates. Please try again or enter coordinates manually.",
        variant: "destructive",
      });
    } finally {
      setIsManualGeocoding(false);
    }
  };

  // Check if scrolling is needed and show/hide scroll button
  useEffect(() => {
    const checkScrollNeeded = () => {
      if (modalContentRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = modalContentRef.current;
        const hasScrollableContent = scrollHeight > clientHeight;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
        setShowScrollButton(hasScrollableContent && !isAtBottom);
      }
    };

    if (isOpen) {
      // Check after a small delay to ensure content is rendered
      setTimeout(checkScrollNeeded, 100);
      const modalElement = modalContentRef.current;
      if (modalElement) {
        modalElement.addEventListener('scroll', checkScrollNeeded);
        window.addEventListener('resize', checkScrollNeeded);
        return () => {
          modalElement.removeEventListener('scroll', checkScrollNeeded);
          window.removeEventListener('resize', checkScrollNeeded);
        };
      }
    }
  }, [isOpen]);

  // Smooth scroll to bottom
  const scrollToBottom = () => {
    if (modalContentRef.current) {
      modalContentRef.current.scrollTo({
        top: modalContentRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const apartmentMutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log('Mutation function called with:', data);
      // Ensure data matches the expected backend schema
      const apartmentData = {
        label: data.label,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        rent: data.rent || null,
        bedrooms: data.bedrooms || null,
        bathrooms: data.bathrooms || null,
        status: data.status || null,
        notes: data.notes || null,
        listingLink: data.listingLink || null,
      };
      console.log('Sending to API:', apartmentData);
      
      const method = editingApartment ? 'PATCH' : 'POST';
      const url = editingApartment ? `/api/apartments/${editingApartment.id}` : '/api/apartments';
      const result = await apiRequest(url, method, apartmentData);
      console.log('API request result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Mutation success:', data);
      // Force refresh the apartments data
      queryClient.invalidateQueries({ queryKey: ['/api/apartments'] });
      queryClient.refetchQueries({ queryKey: ['/api/apartments'] });
      toast({
        title: "Success",
        description: editingApartment ? "Apartment updated successfully!" : "Apartment added successfully!",
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      console.error('Mutation error:', error);
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
        description: `Failed to ${editingApartment ? 'update' : 'add'} apartment: ${error.message}`,
        variant: "destructive",
      });
    },
  });



  const onSubmit = (data: FormData) => {
    console.log('Form submitted with data:', data);
    console.log('Form validation errors:', form.formState.errors);
    console.log('Form is valid:', form.formState.isValid);
    apartmentMutation.mutate(data);
  };

  const handleClose = () => {
    if (!apartmentMutation.isPending) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden" data-testid="modal-add-apartment">
        <DialogHeader>
          <DialogTitle>{editingApartment ? 'Edit Apartment' : 'Add New Apartment'}</DialogTitle>
        </DialogHeader>
        
        <div 
          ref={modalContentRef}
          className="overflow-y-auto max-h-[calc(90vh-120px)]"
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <div className="space-y-1.5">
                      <Autocomplete
                        value={field.value}
                        onValueChange={field.onChange}
                        onOptionSelect={handleAddressSelect}
                        onSearch={debouncedSearch}
                        placeholder="Search for apartment address..."
                        data-testid="input-address"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => geocodeAddressManually(field.value)}
                        disabled={isManualGeocoding || !field.value.trim()}
                        className="w-full text-xs h-7"
                        data-testid="button-manual-geocode"
                      >
                        {isManualGeocoding ? "Finding..." : "Find Coordinates"}
                      </Button>
                    </div>
                  </FormControl>
                  <p className="text-xs text-neutral-500 mt-1">
                    Start typing to search addresses
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Label</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Auto-filled from address"
                      {...field}
                      data-testid="input-label"
                    />
                  </FormControl>
                  <p className="text-xs text-neutral-500 mt-1">
                    Auto-filled from address
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="rent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rent</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="$1,500"
                        {...field}
                        data-testid="input-rent"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bedrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrooms</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-bedrooms">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Studio">Studio</SelectItem>
                        <SelectItem value="1 BR">1 BR</SelectItem>
                        <SelectItem value="2 BR">2 BR</SelectItem>
                        <SelectItem value="3 BR">3 BR</SelectItem>
                        <SelectItem value="4+ BR">4+ BR</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="bathrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bathrooms</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-bathrooms">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="1.5">1.5</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="2.5+">2.5+</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Contacted">Contacted</SelectItem>
                        <SelectItem value="Viewed">Viewed</SelectItem>
                        <SelectItem value="Applied">Applied</SelectItem>
                        <SelectItem value="Rented">Rented</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="40.7128"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-latitude"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="-74.0060"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-longitude"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-xs text-neutral-500 -mt-1">
              Auto-filled from address search
            </p>

            <FormField
              control={form.control}
              name="listingLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Listing Link (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/listing"
                      {...field}
                      data-testid="input-listing-link"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional details or notes..."
                      className="resize-none"
                      rows={2}
                      {...field}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={apartmentMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={apartmentMutation.isPending}
                data-testid="button-submit-apartment"
                onClick={() => {
                  console.log('Submit button clicked');
                  console.log('Form errors before submit:', form.formState.errors);
                }}
              >
                {apartmentMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    {editingApartment ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  editingApartment ? 'Update Apartment' : 'Add Apartment'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        </div>
        
        {/* Scroll Down Button */}
        {showScrollButton && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="fixed bottom-16 right-4 rounded-full p-2 shadow-lg bg-white border-2 hover:bg-neutral-50 z-50"
            onClick={scrollToBottom}
            data-testid="button-scroll-down"
            title="Scroll to bottom"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
