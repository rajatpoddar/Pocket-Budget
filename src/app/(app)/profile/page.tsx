
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { auth, db } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle, Mail, Edit3, Phone, Camera, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const profileSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters.').max(50, 'Display name cannot exceed 50 characters.'),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const phoneSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number (e.g., +1234567890).').or(z.literal("")).optional(),
});
type PhoneFormValues = z.infer<typeof phoneSchema>;


export default function ProfilePage() {
  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [isEditingPhoneNumber, setIsEditingPhoneNumber] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const displayNameForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: '' },
  });

  const phoneNumberForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phoneNumber: '' },
  });

  useEffect(() => {
    if (user?.displayName) {
      displayNameForm.reset({ displayName: user.displayName });
    }
    if (userProfile?.phoneNumber) {
      phoneNumberForm.reset({ phoneNumber: userProfile.phoneNumber });
    } else {
      phoneNumberForm.reset({ phoneNumber: '' });
    }
  }, [user, userProfile, displayNameForm, phoneNumberForm]);

  const getAvatarFallback = (name?: string | null) => {
    if (!name) return "PB";
    const parts = name.split(" ");
    if (parts.length > 1 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const onSubmitDisplayName = async (data: ProfileFormValues) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
      return;
    }
    if (data.displayName === (user.displayName || userProfile?.displayName)) {
      setIsEditingDisplayName(false);
      return;
    }

    setIsLoading(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: data.displayName });
      } else {
        throw new Error("User not authenticated to update Firebase Auth profile.");
      }
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { displayName: data.displayName });
      await refreshUserProfile();
      toast({ title: 'Success', description: 'Display name updated successfully.' });
      setIsEditingDisplayName(false);
    } catch (error: any) {
      console.error("Display name update error:", error);
      toast({ title: 'Error', description: error.message || 'Failed to update display name.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitPhoneNumber = async (data: PhoneFormValues) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
      return;
    }
    const newPhoneNumber = data.phoneNumber || null; 
    if (newPhoneNumber === (userProfile?.phoneNumber || null)) {
        setIsEditingPhoneNumber(false);
        return;
    }

    setIsLoading(true);
    try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { phoneNumber: newPhoneNumber });
        await refreshUserProfile();
        toast({ title: 'Success', description: 'Phone number updated successfully.'});
        setIsEditingPhoneNumber(false);
    } catch (error: any) {
        console.error("Phone number update error:", error);
        toast({ title: 'Error', description: error.message || 'Failed to update phone number.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Upload Error", description: "File is too large. Maximum 5MB allowed.", variant: "destructive"});
        return;
    }
    if (!file.type.startsWith("image/")) {
        toast({ title: "Upload Error", description: "Invalid file type. Please select an image.", variant: "destructive"});
        return;
    }

    setIsUploadingPhoto(true);
    try {
        const storage = getStorage();
        const imageRef = storageRef(storage, `profilePictures/${user.uid}/profileImage`);
        await uploadBytes(imageRef, file);
        const downloadURL = await getDownloadURL(imageRef);

        if (auth.currentUser) {
            await updateProfile(auth.currentUser, { photoURL: downloadURL });
        } else {
             throw new Error("User not authenticated to update Firebase Auth profile picture.");
        }
        
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { photoURL: downloadURL });

        await refreshUserProfile();
        toast({ title: "Success", description: "Profile picture updated successfully."});
    } catch (error: any) {
        console.error("Profile picture upload error:", error); // More detailed logging
        toast({ title: "Upload Error", description: `Failed to upload profile picture: ${error.message}`, variant: "destructive"});
    } finally {
        setIsUploadingPhoto(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; 
        }
    }
  };


  if (authLoading && !user) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-12 w-1/3" />
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader className="items-center">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <Skeleton className="h-8 w-48 mt-4" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!user) {
    return <p className="text-center text-muted-foreground">Please log in to view your profile.</p>;
  }

  const currentPhotoURL = userProfile?.photoURL || user?.photoURL;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold font-headline">Your Profile</h1>
      
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader className="items-center text-center">
            <div className="relative group">
                <Avatar className="h-24 w-24 mb-2 ring-2 ring-primary ring-offset-2 ring-offset-background">
                    <AvatarImage src={currentPhotoURL || `https://placehold.co/128x128.png?text=${getAvatarFallback(userProfile?.displayName || user?.displayName)}`} alt={userProfile?.displayName || user?.displayName || "User"} data-ai-hint="user avatar large" />
                    <AvatarFallback className="text-3xl">{getAvatarFallback(userProfile?.displayName || user?.displayName)}</AvatarFallback>
                </Avatar>
                <Button 
                    variant="outline" 
                    size="icon"
                    className="absolute bottom-2 right-0 rounded-full h-8 w-8 bg-background/80 group-hover:bg-background shadow-md"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    title="Change profile picture"
                >
                    {isUploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4 text-primary" />}
                </Button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    disabled={isUploadingPhoto}
                />
            </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="displayNameCurrent" className="text-sm text-muted-foreground">Display Name</Label>
            {!isEditingDisplayName ? (
              <div className="flex items-center justify-between mt-1">
                <p id="displayNameCurrent" className="text-lg font-semibold">{userProfile?.displayName || user?.displayName || 'Not set'}</p>
                <Button variant="ghost" size="icon" onClick={() => setIsEditingDisplayName(true)} title="Edit display name" disabled={isLoading || isUploadingPhoto}>
                  <Edit3 className="h-5 w-5 text-primary" />
                </Button>
              </div>
            ) : (
              <Form {...displayNameForm}>
                <form onSubmit={displayNameForm.handleSubmit(onSubmitDisplayName)} className="mt-2 space-y-3">
                  <FormField
                    control={displayNameForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="Enter your display name" disabled={isLoading}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => {setIsEditingDisplayName(false); displayNameForm.reset({displayName: userProfile?.displayName || user?.displayName || ""});}} disabled={isLoading}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading || displayNameForm.formState.isSubmitting}>
                      {isLoading || displayNameForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save Name
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="email" className="text-sm text-muted-foreground">Email Address</Label>
            <div className="flex items-center gap-2 mt-1">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <p id="email" className="text-foreground">{user.email}</p>
            </div>
            <p className="text-xs text-muted-foreground">Email address cannot be changed here.</p>
          </div>
        
          <div>
            <Label htmlFor="phoneNumberCurrent" className="text-sm text-muted-foreground">Phone Number</Label>
            {!isEditingPhoneNumber ? (
              <div className="flex items-center justify-between mt-1">
                 <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <p id="phoneNumberCurrent" className="text-lg font-semibold">{userProfile?.phoneNumber || 'Not set'}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsEditingPhoneNumber(true)} title="Edit phone number" disabled={isLoading || isUploadingPhoto}>
                  <Edit3 className="h-5 w-5 text-primary" />
                </Button>
              </div>
            ) : (
              <Form {...phoneNumberForm}>
                <form onSubmit={phoneNumberForm.handleSubmit(onSubmitPhoneNumber)} className="mt-2 space-y-3">
                  <FormField
                    control={phoneNumberForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="Enter your phone number (e.g. +1XXXYYYZZZZ)" disabled={isLoading}/>
                        </FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => {setIsEditingPhoneNumber(false); phoneNumberForm.reset({phoneNumber: userProfile?.phoneNumber || ""});}} disabled={isLoading}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading || phoneNumberForm.formState.isSubmitting}>
                       {isLoading || phoneNumberForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save Phone
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>

        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground text-center w-full">Phone number verification coming soon!</p>
        </CardFooter>
      </Card>
    </div>
  );
}

    