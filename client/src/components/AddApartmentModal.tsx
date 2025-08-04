import { useState } from "react";
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
import { insertApartmentSchema } from "@shared/schema";

interface AddApartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = insertApartmentSchema.extend({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

type FormData = z.infer<typeof formSchema>;

export default function AddApartmentModal({ isOpen, onClose }: AddApartmentModalProps) {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    }
  });

  const addApartmentMutation = useMutation({
    mutationFn: async (data: FormData) => {
      await apiRequest('POST', '/api/apartments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/apartments'] });
      toast({
        title: "Success",
        description: "Apartment added successfully!",
      });
      form.reset();
      onClose();
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
        description: "Failed to add apartment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const geocodeAddress = async (address: string) => {
    if (!address.trim()) return;

    setIsGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        form.setValue('latitude', parseFloat(lat));
        form.setValue('longitude', parseFloat(lon));
        toast({
          title: "Address found",
          description: "Coordinates updated successfully!",
        });
      } else {
        toast({
          title: "Address not found",
          description: "Please check the address or enter manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Geocoding error",
        description: "Failed to find address coordinates.",
        variant: "destructive",
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const onSubmit = (data: FormData) => {
    addApartmentMutation.mutate(data);
  };

  const handleClose = () => {
    if (!addApartmentMutation.isPending) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" data-testid="modal-add-apartment">
        <DialogHeader>
          <DialogTitle>Add New Apartment</DialogTitle>
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
                    <div className="space-y-2">
                      <Input
                        placeholder="Enter apartment address..."
                        {...field}
                        data-testid="input-address"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => geocodeAddress(field.value)}
                        disabled={isGeocoding || !field.value.trim()}
                        className="w-full text-xs"
                        data-testid="button-geocode"
                      >
                        {isGeocoding ? "Finding..." : "Find Coordinates"}
                      </Button>
                    </div>
                  </FormControl>
                  <p className="text-xs text-neutral-500">
                    Click "Find Coordinates" to automatically locate the address
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
                      placeholder="e.g., Sunny Downtown Loft"
                      {...field}
                      data-testid="input-label"
                    />
                  </FormControl>
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
                disabled={addApartmentMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addApartmentMutation.isPending}
                data-testid="button-add-apartment"
              >
                {addApartmentMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Adding...
                  </>
                ) : (
                  "Add Apartment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
