
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { IncomeCategory } from "@/types";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number."),
  categoryId: z.string().min(1, "Category is required."),
  date: z.date({ required_error: "Date is required."}),
});

type AddDailyIncomeFormValues = z.infer<typeof formSchema>;

interface AddDailyIncomeDialogProps {
  categories: IncomeCategory[]; // Expecting all daily fixed income categories
  onSubmit: (values: AddDailyIncomeFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AddDailyIncomeDialog({ categories, onSubmit, onCancel, isLoading }: AddDailyIncomeDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<IncomeCategory | undefined>(categories.length === 1 ? categories[0] : undefined);
  
  const form = useForm<AddDailyIncomeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: selectedCategory?.dailyFixedAmount || 0,
      categoryId: selectedCategory?.id || "",
      date: new Date(),
    },
  });

  useEffect(() => {
    if (categories.length === 1 && !selectedCategory) {
        setSelectedCategory(categories[0]);
        form.reset({
            amount: categories[0].dailyFixedAmount || 0,
            categoryId: categories[0].id,
            date: new Date(),
        });
    }
  }, [categories, form, selectedCategory]);

  const handleCategoryChange = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    setSelectedCategory(cat);
    form.setValue("categoryId", categoryId);
    if (cat?.dailyFixedAmount) {
      form.setValue("amount", cat.dailyFixedAmount);
    } else {
      form.setValue("amount", 0);
    }
  };
  
  const handleSubmit = (values: AddDailyIncomeFormValues) => {
    onSubmit(values);
    if (!isLoading) {
        form.reset({
            amount: selectedCategory?.dailyFixedAmount || 0,
            categoryId: selectedCategory?.id || "",
            date: new Date(),
        });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
        {categories.length > 1 && (
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={handleCategoryChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a daily income category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name} (₹{category.dailyFixedAmount?.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
         {categories.length === 1 && selectedCategory && (
            <p className="text-sm text-muted-foreground">
                Logging income for: <strong>{selectedCategory.name}</strong>
            </p>
        )}

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (₹)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="Enter amount" 
                  {...field} 
                  value={field.value ?? ""}
                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                  disabled={!selectedCategory && categories.length > 1} // Disable if multiple categories and none selected
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                       disabled={!selectedCategory && categories.length > 1}
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
        
        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
          <Button 
            type="submit" 
            disabled={isLoading || (!selectedCategory && categories.length > 1)}
          >
            {isLoading ? "Adding..." : "Confirm & Add"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

