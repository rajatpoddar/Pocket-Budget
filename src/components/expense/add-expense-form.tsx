
"use client";

import React from 'react'; // Added React import
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Expense, ExpenseCategory } from "@/types";
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/default-categories';

const formSchema = z.object({
  description: z.string().min(2, "Description must be at least 2 characters.").max(100, "Description must be at most 100 characters."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  date: z.date({ required_error: "Date is required."}),
  categoryId: z.string().min(1, "Category is required."),
});

type AddExpenseFormValues = z.infer<typeof formSchema>;

interface AddExpenseFormProps {
  onSubmit: (values: AddExpenseFormValues) => void;
  categories: ExpenseCategory[]; // User's custom categories
  initialData?: Partial<Expense>;
  onCancel?: () => void;
}

export function AddExpenseForm({ onSubmit, categories: userCategories, initialData, onCancel }: AddExpenseFormProps) {
  const allCategories = React.useMemo(() => {
    const combined = [...DEFAULT_EXPENSE_CATEGORIES, ...userCategories];
    const uniqueCategories = Array.from(new Map(combined.map(cat => [cat.id, cat])).values());
    return uniqueCategories.sort((a,b) => a.name.localeCompare(b.name));
  }, [userCategories]);
  
  const form = useForm<AddExpenseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: initialData?.description || "",
      amount: initialData?.amount || 0,
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      categoryId: initialData?.categoryId || "",
    },
  });

  const handleSubmit = (values: AddExpenseFormValues) => {
    onSubmit(values);
     form.reset({
      description: "",
      amount: 0,
      date: new Date(),
      categoryId: ""
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Groceries from Local Mart" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (â‚¹)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="3000" {...field} />
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
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an expense category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {allCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                      {category.isDefault ? " (Default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
          <Button type="submit">Save Expense</Button>
        </div>
      </form>
    </Form>
  );
}
