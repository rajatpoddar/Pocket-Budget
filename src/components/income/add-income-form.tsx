
"use client";

import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Info } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Income, IncomeCategory, Client, FreelanceDetails } from "@/types";
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';

const NEW_CLIENT_VALUE = "--new--";

const baseSchema = z.object({
  description: z.string().min(2, "Description must be at least 2 characters.").max(100, "Description must be at most 100 characters."),
  amount: z.coerce.number().positive("Amount paid must be a positive number."),
  date: z.date({ required_error: "Date is required."}),
  categoryId: z.string().min(1, "Category is required."),
  existingClientId: z.string().optional(),
  clientName: z.string().optional(),
  clientNumber: z.string().optional(),
  clientAddress: z.string().optional(),
  projectCost: z.coerce.number().optional(),
  numberOfWorkers: z.coerce.number().int().positive("Number of workers must be a positive integer.").optional().or(z.literal('')),
});


type AddIncomeFormValues = z.infer<typeof baseSchema>;

interface AddIncomeFormProps {
  onSubmit: (values: AddIncomeFormValues, isNewClient: boolean, categoryHasProjectTracking?: boolean) => void;
  categories: IncomeCategory[];
  clients: Client[];
  initialData?: Partial<Income> & { date: Date }; 
  onCancel?: () => void;
}

export function AddIncomeForm({ onSubmit, categories, clients, initialData, onCancel }: AddIncomeFormProps) {
  const form = useForm<AddIncomeFormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      description: initialData?.description || "",
      amount: initialData?.amount || 0,
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      categoryId: initialData?.categoryId || "",
      existingClientId: initialData?.clientId || "",
      clientName: initialData?.freelanceDetails?.clientName || "",
      clientNumber: initialData?.freelanceDetails?.clientNumber || "",
      clientAddress: initialData?.freelanceDetails?.clientAddress || "",
      projectCost: initialData?.freelanceDetails?.projectCost || undefined,
      numberOfWorkers: initialData?.freelanceDetails?.numberOfWorkers || undefined,
    },
  });

  const selectedCategoryId = form.watch("categoryId");
  const selectedExistingClientId = form.watch("existingClientId");

  const [currentCategory, setCurrentCategory] = useState<IncomeCategory | undefined>(undefined);
  const [isNewClientEntry, setIsNewClientEntry] = useState(false);

  useEffect(() => {
    const category = categories.find(c => c.id === selectedCategoryId);
    setCurrentCategory(category);

    if (category?.hasProjectTracking) {
        setIsNewClientEntry(selectedExistingClientId === NEW_CLIENT_VALUE || !selectedExistingClientId);
    } else {
        setIsNewClientEntry(false);
        // Clear freelance fields if category does not have project tracking
        form.setValue("existingClientId", "");
        form.setValue("clientName", "");
        form.setValue("clientNumber", "");
        form.setValue("clientAddress", "");
        form.setValue("projectCost", undefined);
        form.setValue("numberOfWorkers", undefined);
    }
    
    if (category?.isDailyFixedIncome && category.dailyFixedAmount !== undefined && !initialData?.amount) {
        form.setValue("amount", category.dailyFixedAmount);
    } else if (!initialData?.amount && !category?.isDailyFixedIncome) {
        // If switching from a fixed income category to non-fixed, and no initial amount, reset to 0 or user preference
        // For now, let's not reset if user already typed something. Only on initial load or category change from fixed.
    }

  }, [selectedCategoryId, categories, form, selectedExistingClientId, initialData]);

  useEffect(() => {
    if (currentCategory?.hasProjectTracking && selectedExistingClientId && selectedExistingClientId !== NEW_CLIENT_VALUE) {
      const client = clients.find(c => c.id === selectedExistingClientId);
      if (client) {
        form.setValue("clientName", client.name);
        form.setValue("clientNumber", client.number || "");
        form.setValue("clientAddress", client.address || "");
      }
    } else if (currentCategory?.hasProjectTracking && isNewClientEntry) {
        if(!initialData?.clientId || initialData.clientId !== selectedExistingClientId) {
            if(form.getValues("existingClientId") === NEW_CLIENT_VALUE){ 
                 form.setValue("clientName", "");
                 form.setValue("clientNumber", "");
                 form.setValue("clientAddress", "");
            }
        }
    }
  }, [selectedExistingClientId, clients, form, currentCategory, isNewClientEntry, initialData]);


  const handleSubmit = (values: AddIncomeFormValues) => {
    let valid = true;
    const category = categories.find(c => c.id === values.categoryId);
    
    if (category?.hasProjectTracking) {
      if (isNewClientEntry && (!values.clientName || values.clientName.trim().length < 2)) {
        form.setError("clientName", { type: "manual", message: "Client name must be at least 2 characters for new clients." });
        valid = false;
      }
      if (values.projectCost === undefined || values.projectCost <= 0) {
        form.setError("projectCost", { type: "manual", message: "Project cost must be a positive number for project-based income." });
        valid = false;
      }
      if (values.amount > (values.projectCost || 0)) {
        form.setError("amount", {type: "manual", message: "Amount paid cannot exceed project cost."});
        valid = false;
      }
      if (values.numberOfWorkers && (isNaN(Number(values.numberOfWorkers)) || Number(values.numberOfWorkers) <= 0 || !Number.isInteger(Number(values.numberOfWorkers)))) {
        form.setError("numberOfWorkers", { type: "manual", message: "Number of workers must be a positive integer." });
        valid = false;
      }
    }
    if (!valid) return;

    const submissionValues = {
        ...values,
        numberOfWorkers: values.numberOfWorkers ? Number(values.numberOfWorkers) : undefined,
    };

    onSubmit(submissionValues, category?.hasProjectTracking && isNewClientEntry, category?.hasProjectTracking);
    if (!initialData) { 
        form.reset({
            description: "",
            amount: 0,
            date: new Date(),
            categoryId: "",
            existingClientId: "",
            clientName: "",
            clientNumber: "",
            clientAddress: "",
            projectCost: undefined,
            numberOfWorkers: undefined,
        });
        setCurrentCategory(undefined);
        setIsNewClientEntry(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Monthly Salary, Project Payment" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value);
                  const cat = categories.find(c => c.id === value);
                  if (!cat?.hasProjectTracking) {
                    form.setValue("existingClientId", ""); 
                  }
                  if (cat?.isDailyFixedIncome && cat.dailyFixedAmount !== undefined) {
                    form.setValue("amount", cat.dailyFixedAmount);
                  } else if (form.getValues("amount") === currentCategory?.dailyFixedAmount) {
                     // If previously was fixed, and amount matches, clear it or set to 0
                     // form.setValue("amount", 0); // Or let user manage
                  }
                }} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an income category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name} 
                      {category.hasProjectTracking ? " (Project)" : ""}
                      {category.isDailyFixedIncome ? ` (Fixed: ₹${category.dailyFixedAmount?.toLocaleString()})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {currentCategory?.hasProjectTracking && (
          <>
            <Separator className="my-6" />
            <p className="text-sm font-medium text-muted-foreground flex items-center"><Info className="w-4 h-4 mr-2 text-primary"/>Project Details</p>
            <FormField
              control={form.control}
              name="existingClientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Existing Client</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an existing client or add new" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NEW_CLIENT_VALUE}>--- Enter New Client ---</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Client Co. Ltd." {...field} disabled={currentCategory?.hasProjectTracking && !isNewClientEntry && !!selectedExistingClientId} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Contact Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="9876543210" {...field} disabled={currentCategory?.hasProjectTracking && !isNewClientEntry && !!selectedExistingClientId}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Address (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="123 Business Rd, Suite 404, City" {...field} disabled={currentCategory?.hasProjectTracking && !isNewClientEntry && !!selectedExistingClientId}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="projectCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Project Cost (₹)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="10000" 
                      {...field} 
                      value={field.value ?? ""}
                      onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numberOfWorkers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Workers (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="e.g., 5" 
                      {...field} 
                      value={field.value ?? ""}
                      onChange={e => field.onChange(e.target.value === "" ? "" : parseInt(e.target.value, 10) || "")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <Separator className="my-6" />
          </>
        )}

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount Received (₹)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="5000" 
                  {...field} 
                  value={field.value ?? ""}
                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                  readOnly={currentCategory?.isDailyFixedIncome && currentCategory.dailyFixedAmount === field.value && !initialData} // Example: make read-only if fixed & matches & not editing initialData
                />
              </FormControl>
              {currentCategory?.isDailyFixedIncome && currentCategory.dailyFixedAmount === field.value && (
                 <FormDescription className="text-xs">Amount pre-filled from daily fixed income category setting.</FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date Received</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
          <Button type="submit">{initialData?.id ? "Update" : "Save"} Income</Button>
        </div>
      </form>
    </Form>
  );
}
