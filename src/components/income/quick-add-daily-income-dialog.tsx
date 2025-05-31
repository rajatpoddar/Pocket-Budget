
"use client";

import React, { useEffect } from 'react';
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
import type { IncomeCategory } from "@/types";

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number."),
});

type QuickAddDailyIncomeFormValues = z.infer<typeof formSchema>;

interface QuickAddDailyIncomeDialogProps {
  category: IncomeCategory; // Expecting the single daily fixed income category
  onSubmit: (values: QuickAddDailyIncomeFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function QuickAddDailyIncomeDialog({ category, onSubmit, onCancel, isLoading }: QuickAddDailyIncomeDialogProps) {
  const form = useForm<QuickAddDailyIncomeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: category.dailyFixedAmount || 0,
    },
  });

  // Reset form if category changes (though for this specific dialog, category is fixed once opened)
  useEffect(() => {
    form.reset({ amount: category.dailyFixedAmount || 0 });
  }, [category, form]);

  const handleSubmit = (values: QuickAddDailyIncomeFormValues) => {
    onSubmit(values);
    if (!isLoading) { // Only reset if not loading (i.e., submission was successful or didn't start)
        form.reset({ amount: category.dailyFixedAmount || 0 });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (₹) for {category.name}</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="Enter amount" 
                  {...field} 
                  value={field.value ?? ""}
                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Adding..." : "Confirm & Add"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
