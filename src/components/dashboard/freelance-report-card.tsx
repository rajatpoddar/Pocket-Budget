
"use client";

import type { Income } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Briefcase, Phone, MapPin, AlertTriangle, CheckCircle2, Users, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface FreelanceReportCardProps {
  projectTrackingIncomes: Income[]; // Renamed from freelanceIncomes
  onClearDues: (income: Income) => void;
}

export function FreelanceReportCard({ projectTrackingIncomes, onClearDues }: FreelanceReportCardProps) {
  const projectsWithDue = projectTrackingIncomes
    .filter(
      (income) => income.freelanceDetails && !income.freelanceDetails.duesClearedAt && (income.freelanceDetails.projectCost - income.amount) > 0
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const clearedOrFullyPaidProjects = projectTrackingIncomes
    .filter(
      (income) => income.freelanceDetails && (income.freelanceDetails.duesClearedAt || (income.freelanceDetails.projectCost - income.amount) <= 0)
    )
    .sort((a, b) => {
        const dateA = a.freelanceDetails?.duesClearedAt ? new Date(a.freelanceDetails.duesClearedAt) : new Date(a.date);
        const dateB = b.freelanceDetails?.duesClearedAt ? new Date(b.freelanceDetails.duesClearedAt) : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
    });


  return (
    <Card className="shadow-lg w-full">
      <CardHeader>
        <CardTitle className="flex items-center text-xl md:text-2xl">
          <Briefcase className="h-5 w-5 mr-2 text-primary" />
          Project Financials Overview
        </CardTitle>
        <CardDescription>Track payments and dues for your projects.</CardDescription>
      </CardHeader>
      <CardContent>
        {projectTrackingIncomes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects with financial details recorded yet.</p>
        ) : (
          <ScrollArea className="h-[350px] sm:h-[400px] pr-3">
            <div className="space-y-6">
              {projectsWithDue.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-destructive flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2"/>
                    Projects with Dues
                  </h3>
                  <div className="space-y-4">
                    {projectsWithDue.map((income) => {
                      if (!income.freelanceDetails) return null;
                      const dueAmount = income.freelanceDetails.projectCost - income.amount;
                      return (
                        <div key={income.id} className="p-4 border rounded-lg bg-card shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-150 ease-out">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-card-foreground">{income.freelanceDetails.clientName}</h4>
                            <Badge variant="destructive">
                              Due: ₹{dueAmount.toLocaleString()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1 truncate" title={income.description}>{income.description}</p>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div>Project Cost: ₹{income.freelanceDetails.projectCost.toLocaleString()}</div>
                            <div>Paid: ₹{income.amount.toLocaleString()}</div>
                            {income.freelanceDetails.numberOfWorkers && (
                                <div className="flex items-center">
                                    <Users className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                                    <span>Workers: {income.freelanceDetails.numberOfWorkers}</span>
                                </div>
                            )}
                          </div>
                          {(income.freelanceDetails.clientNumber || income.freelanceDetails.clientAddress) && (
                            <div className="mt-3 pt-3 border-t border-border/50 text-xs space-y-1.5">
                              {income.freelanceDetails.clientNumber && (
                                <div className="flex items-center text-muted-foreground">
                                  <Phone className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                                  <span>{income.freelanceDetails.clientNumber}</span>
                                </div>
                              )}
                              {income.freelanceDetails.clientAddress && (
                                <div className="flex items-start text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5 mr-1.5 mt-0.5 flex-shrink-0" />
                                  <span className="break-words">{income.freelanceDetails.clientAddress}</span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="mt-3 pt-3 border-t border-border/50 flex justify-end">
                            <Button size="sm" variant="outline" onClick={() => onClearDues(income)} className="text-xs">
                                <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Mark as Cleared
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {clearedOrFullyPaidProjects.length > 0 && (
                 <div>
                  <h3 className="text-lg font-semibold mb-3 mt-6 text-green-600 dark:text-green-500 flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Cleared / Fully Paid Projects
                  </h3>
                   <div className="space-y-4">
                    {clearedOrFullyPaidProjects.map((income) => {
                      if (!income.freelanceDetails) return null;
                      const dueAmount = income.freelanceDetails.projectCost - income.amount;
                      return (
                        <div key={income.id} className="p-4 border rounded-lg bg-card shadow-sm opacity-90 hover:shadow-md hover:scale-[1.01] transition-all duration-150 ease-out">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-card-foreground">{income.freelanceDetails.clientName}</h4>
                            {income.freelanceDetails.duesClearedAt ? (
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                    Cleared: {format(new Date(income.freelanceDetails.duesClearedAt), "PPp")}
                                </Badge>
                            ) : (
                                <Badge variant="secondary">Paid in Full</Badge>
                            )}
                          </div>
                           <p className="text-sm text-muted-foreground mb-1 truncate" title={income.description}>{income.description}</p>
                           <div className="text-xs text-muted-foreground space-y-0.5">
                            <div>Project Cost: ₹{income.freelanceDetails.projectCost.toLocaleString()}</div>
                            <div>Paid: ₹{income.amount.toLocaleString()}</div>
                             {income.freelanceDetails.numberOfWorkers && (
                                <div className="flex items-center">
                                    <Users className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                                    <span>Workers: {income.freelanceDetails.numberOfWorkers}</span>
                                </div>
                            )}
                          </div>
                           {(income.freelanceDetails.clientNumber || income.freelanceDetails.clientAddress) && (
                            <div className="mt-3 pt-3 border-t border-border/50 text-xs space-y-1.5">
                              {income.freelanceDetails.clientNumber && (
                                <div className="flex items-center text-muted-foreground">
                                  <Phone className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                                  <span>{income.freelanceDetails.clientNumber}</span>
                                </div>
                              )}
                              {income.freelanceDetails.clientAddress && (
                                <div className="flex items-start text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5 mr-1.5 mt-0.5 flex-shrink-0" />
                                  <span className="break-words">{income.freelanceDetails.clientAddress}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

