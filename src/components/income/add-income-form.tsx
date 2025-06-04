
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
import { DEFAULT_INCOME_CATEGORIES } from '@/lib/default-categories';

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
  numberOfWorkers: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = parseFloat(String(val));
      return isNaN(num) ? undefined : num;
    },
    z.number().int("Number of workers must be an integer.").min(0, "Number of workers cannot be negative.").optional()
  ),
});


type AddIncomeFormValues = z.infer<typeof baseSchema>;

interface AddIncomeFormProps {
  onSubmit: (values: AddIncomeFormValues, isNewClient: boolean, categoryHasProjectTracking?: boolean) => void;
  categories: IncomeCategory[]; // User's custom categories
  clients: Client[];
  initialData?: Partial<Income> & { date: Date }; 
  onCancel?: () => void;
}

export function AddIncomeForm({ onSubmit, categories: userCategories, clients, initialData, onCancel }: AddIncomeFormProps) {
  const allCategories = React.useMemo(() => {
    const combined = [...DEFAULT_INCOME_CATEGORIES, ...userCategories];
    // Remove duplicates by ID, preferring user categories over defaults if IDs somehow clash (should not happen with 'default-' prefix)
    const uniqueCategories = Array.from(new Map(combined.map(cat => [cat.id, cat])).values());
    return uniqueCategories.sort((a,b) => a.name.localeCompare(b.name));
  }, [userCategories]);

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
      numberOfWorkers: initialData?.freelanceDetails?.numberOfWorkers !== undefined ? initialData.freelanceDetails.numberOfWorkers : undefined,
    },
  });

  const selectedCategoryId = form.watch("categoryId");
  const selectedExistingClientId = form.watch("existingClientId");

  const [currentCategory, setCurrentCategory] = useState<IncomeCategory | undefined>(
    initialData?.categoryId ? allCategories.find(c => c.id === initialData.categoryId) : undefined
  );
  const [isNewClientEntry, setIsNewClientEntry] = useState(false);

  useEffect(() => {
    const category = allCategories.find(c => c.id === selectedCategoryId);
    setCurrentCategory(category);

    // Only user-defined categories can have project tracking or be daily fixed income
    const isUserCategory = category && !category.isDefault;

    if (isUserCategory && category?.hasProjectTracking) {
        setIsNewClientEntry(selectedExistingClientId === NEW_CLIENT_VALUE || !selectedExistingClientId);
    } else {
        setIsNewClientEntry(false);
        // Reset project-specific fields if category is default or doesn't have project tracking
        if (category?.isDefault || (isUserCategory && !category.hasProjectTracking)) {
            form.setValue("existingClientId", "");
            form.setValue("clientName", "");
            form.setValue("clientNumber", "");
            form.setValue("clientAddress", "");
            form.setValue("projectCost", undefined);
            form.setValue("numberOfWorkers", undefined);
        }
    }
    
    if (isUserCategory && category?.isDailyFixedIncome && category.dailyFixedAmount !== undefined && !initialData?.amount) {
        form.setValue("amount", category.dailyFixedAmount);
    }

  }, [selectedCategoryId, allCategories, form, selectedExistingClientId, initialData]);

  useEffect(() => {
    const category = allCategories.find(c => c.id === selectedCategoryId);
    const isUserCategoryWithProjectTracking = category && !category.isDefault && category.hasProjectTracking;

    if (isUserCategoryWithProjectTracking && selectedExistingClientId && selectedExistingClientId !== NEW_CLIENT_VALUE) {
      const client = clients.find(c => c.id === selectedExistingClientId);
      if (client) {
        form.setValue("clientName", client.name);
        form.setValue("clientNumber", client.number || "");
        form.setValue("clientAddress", client.address || "");
      }
    } else if (isUserCategoryWithProjectTracking && isNewClientEntry) {
        if(!initialData?.clientId || initialData.clientId !== selectedExistingClientId) {
            if(form.getValues("existingClientId") === NEW_CLIENT_VALUE){ 
                 form.setValue("clientName", "");
                 form.setValue("clientNumber", "");
                 form.setValue("clientAddress", "");
            }
        }
    }
  }, [selectedExistingClientId, clients, form, currentCategory, isNewClientEntry, initialData, selectedCategoryId, allCategories]);


  const handleSubmit = (values: AddIncomeFormValues) => {
    let valid = true;
    form.clearErrors(); 
    
    const isProjectTrackingCategory = currentCategory && !currentCategory.isDefault && currentCategory.hasProjectTracking;

    if (isProjectTrackingCategory) {
      if (isNewClientEntry && (!values.clientName || values.clientName.trim().length < 2)) {
        form.setError("clientName", { type: "manual", message: "Client name must be at least 2 characters for new clients." });
        valid = false;
      }
      if (values.projectCost === undefined || values.projectCost <= 0) {
        form.setError("projectCost", { type: "manual", message: "Project cost must be a positive number." });
        valid = false;
      }
      if (values.amount > (values.projectCost || 0)) {
        form.setError("amount", {type: "manual", message: "Amount paid cannot exceed project cost."});
        valid = false;
      }
    }
    if (!valid) return;

    onSubmit(
        values, 
        !!(isProjectTrackingCategory && isNewClientEntry), 
        isProjectTrackingCategory
    );
    
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

  const categoryForProjectTracking = currentCategory && !currentCategory.isDefault && currentCategory.hasProjectTracking;
  const categoryForDailyFixed = currentCategory && !currentCategory.isDefault && currentCategory.isDailyFixedIncome;

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
                  const cat = allCategories.find(c => c.id === value);
                  if (cat && !cat.isDefault && cat.isDailyFixedIncome && cat.dailyFixedAmount !== undefined) {
                    form.setValue("amount", cat.dailyFixedAmount);
                  }
                  // If not a project tracking category (or default), clear client selection
                  if (!cat || cat.isDefault || !cat.hasProjectTracking) {
                     form.setValue("existingClientId", ""); 
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
                  {allCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name} 
                      {category.isDefault ? " (Default)" : ""}
                      {!category.isDefault && category.hasProjectTracking ? " (Project)" : ""}
                      {!category.isDefault && category.isDailyFixedIncome ? ` (Fixed: â‚¹${category.dailyFixedAmount?.toLocaleString()})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {categoryForProjectTracking && (
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
                    value={field.value}
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
                    <Input placeholder="Client Co. Ltd." {...field} disabled={categoryForProjectTracking && !isNewClientEntry && !!selectedExistingClientId} />
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
                    <Input placeholder="9876543210" {...field} disabled={categoryForProjectTracking && !isNewClientEntry && !!selectedExistingClientId}/>
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
                    <Textarea placeholder="123 Business Rd, Suite 404, City" {...field} disabled={categoryForProjectTracking && !isNewClientEntry && !!selectedExistingClientId}/>
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
                  <FormLabel>Total Project Cost (â‚¹)</FormLabel>
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
                      placeholder="e.g., 5 (can be 0)" 
                      {...field} 
                      value={field.value ?? ""}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === "") {
                          field.onChange(undefined);
                        } else {
                          const num = parseFloat(val);
                          field.onChange(isNaN(num) ? undefined : num);
                        }
                      }}
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
              <FormLabel>Amount Received (â‚¹)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="5000" 
                  {...field} 
                  value={field.value ?? ""}
                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                  readOnly={categoryForDailyFixed && currentCategory?.dailyFixedAmount === field.value && !initialData?.amount}
                />
              </FormControl>
              {categoryForDailyFixed && currentCategory?.dailyFixedAmount === field.value && (
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
              <Popover modal={true}>
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
                <PopoverContent className="w-auto p-0 z-[51]" align="start">
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
