import { useState, useEffect } from "react";
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
  notes: z.string().optional(),
  listingLink: z.string().url().optional().or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

export default function AddApartmentModal({
  isOpen,
  onClose,
  editingApartment,
}: AddApartmentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const debouncedSearch = createDebouncedSearch();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      address: "",
      latitude: 40.7128,
      longitude: -74.0060,
      rent: "",
      bedrooms: "",
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
        notes: data.notes || null,
        listingLink: data.listingLink || null,
      };
      console.log('Sending to API:', apartmentData);
      
      const method = editingApartment ? 'PATCH' : 'POST';
      const url = editingApartment ? `/api/apartments/${editingApartment.id}` : '/api/apartments';
      const result = await apiRequest(method, url, apartmentData);
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
      <DialogContent className="max-w-md" data-testid="modal-add-apartment">
        <DialogHeader>
          <DialogTitle>{editingApartment ? 'Edit Apartment' : 'Add New Apartment'}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Autocomplete
                      value={field.value}
                      onValueChange={field.onChange}
                      onOptionSelect={handleAddressSelect}
                      onSearch={debouncedSearch}
                      placeholder="Search for apartment address..."
                      data-testid="input-address"
                    />
                  </FormControl>
                  <p className="text-xs text-neutral-500">
                    Start typing to search for addresses. Coordinates and label will be auto-filled.
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
                  <p className="text-xs text-neutral-500">
                    Auto-filled when you select an address. You can customize it if needed.
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
                      rows={3}
                      {...field}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
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
      </DialogContent>
    </Dialog>
  );
}
