
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import type { IncomeCategory } from "@/types";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import React from "react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name must be at most 50 characters."),
  description: z.string().max(100, "Description must be at most 100 characters.").optional(),
  hasProjectTracking: z.boolean().optional(),
  isDailyFixedIncome: z.boolean().optional(),
  dailyFixedAmount: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
  if (data.isDailyFixedIncome && (data.dailyFixedAmount === undefined || data.dailyFixedAmount <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Daily fixed amount must be a positive number if daily fixed income is enabled.",
      path: ["dailyFixedAmount"],
    });
  }
});

type AddCategoryFormValues = z.infer<typeof formSchema>;

interface AddCategoryFormProps {
  onSubmit: (values: AddCategoryFormValues) => void;
  initialData?: Partial<IncomeCategory>;
  onCancel?: () => void;
}

export function AddCategoryForm({ onSubmit, initialData, onCancel }: AddCategoryFormProps) {
  const form = useForm<AddCategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      hasProjectTracking: initialData?.hasProjectTracking || false,
      isDailyFixedIncome: initialData?.isDailyFixedIncome || false,
      dailyFixedAmount: initialData?.dailyFixedAmount || undefined,
    },
  });

  const watchHasProjectTracking = form.watch("hasProjectTracking");
  const watchIsDailyFixedIncome = form.watch("isDailyFixedIncome");

  React.useEffect(() => {
    if (watchHasProjectTracking && form.getValues("isDailyFixedIncome")) {
      form.setValue("isDailyFixedIncome", false);
      form.setValue("dailyFixedAmount", undefined);
    }
  }, [watchHasProjectTracking, form]);

  React.useEffect(() => {
    if (watchIsDailyFixedIncome && form.getValues("hasProjectTracking")) {
      form.setValue("hasProjectTracking", false);
    }
    if (!watchIsDailyFixedIncome) {
        form.setValue("dailyFixedAmount", undefined); // Clear amount if daily fixed is turned off
    }
  }, [watchIsDailyFixedIncome, form]);


  const handleSubmit = (values: AddCategoryFormValues) => {
    const finalValues = {
        ...values,
        dailyFixedAmount: values.isDailyFixedIncome ? values.dailyFixedAmount : undefined,
    };
    onSubmit(finalValues);
    if (!initialData) { 
        form.reset({
            name: "",
            description: "",
            hasProjectTracking: false,
            isDailyFixedIncome: false,
            dailyFixedAmount: undefined,
        });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Salary or Project Alpha" {...field} disabled={initialData?.name === "Freelance"} />
              </FormControl>
              {initialData?.name === "Freelance" && <p className="text-xs text-muted-foreground pt-1">The name "Freelance" cannot be changed for the default category, but other properties can be.</p>}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Monthly salary payment or Details about Project Alpha" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Separator />

        <FormField
          control={form.control}
          name="hasProjectTracking"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/30">
              <div className="space-y-0.5">
                <FormLabel>Enable Project Tracking</FormLabel>
                <FormDescription className="text-xs">
                  Allows associating clients, project costs, and dues. Cannot be active with Daily Fixed Income.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={watchIsDailyFixedIncome}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isDailyFixedIncome"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/30">
              <div className="space-y-0.5">
                <FormLabel>Enable Daily Fixed Income</FormLabel>
                 <FormDescription className="text-xs">
                  Sets a fixed daily income amount for this category. Cannot be active with Project Tracking.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={watchHasProjectTracking}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {watchIsDailyFixedIncome && (
          <FormField
            control={form.control}
            name="dailyFixedAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Daily Fixed Amount (₹)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="e.g., 500" 
                    {...field} 
                    value={field.value ?? ""}
                    onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
          <Button type="submit">Save Category</Button>
        </div>
      </form>
    </Form>
  );
}
