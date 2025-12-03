'use client'
import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Users, TrendingUp, Wallet, Calendar, Loader, Gift, Lock, CheckCircle } from "lucide-react"
import { useToast } from '@/hooks/use-toast'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { ReferralService } from '@/lib/user-service'

interface ReferralDetails {
  referrals: any[];
  totalReferrals: number;
  totalEarnings: number;
  referralsWithDeposits: number;
  referralsWithoutDeposits: number;
}

interface MilestoneStatus {
  id: string;
  target: number;
  reward: number;
  status: 'locked' | 'claimable' | 'claimed';
}

export default function MyReferralsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [referralDetails, setReferralDetails] = useState<ReferralDetails>({
    referrals: [],
    totalReferrals: 0,
    totalEarnings: 0,
    referralsWithDeposits: 0,
    referralsWithoutDeposits: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [validReferrals, setValidReferrals] = useState(0);
  const [milestones, setMilestones] = useState<MilestoneStatus[]>([]);
  const [nextTarget, setNextTarget] = useState<number | null>(null);
  const [isClaiming, setIsClaiming] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const details = await ReferralService.getReferralDetails(currentUser.uid);
          setReferralDetails(details);

          const milestoneStatus = await ReferralService.getReferralMilestoneStatus(currentUser.uid);
          setValidReferrals(milestoneStatus.validReferrals);
          setMilestones(milestoneStatus.milestones);
          setNextTarget(milestoneStatus.nextTarget);
        } catch (error) {
          console.error('Error loading referral details:', error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to load referral details.' });
        } finally {
          setIsLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, [toast]);

  const handleClaimMilestone = async (milestone: MilestoneStatus) => {
    if (!user) return;
    setIsClaiming(milestone.id);
    try {
      const result = await ReferralService.claimReferralMilestone(user.uid, milestone.target);
      if (result.success) {
        toast({ title: 'Reward Claimed', description: result.message });
        const milestoneStatus = await ReferralService.getReferralMilestoneStatus(user.uid);
        setValidReferrals(milestoneStatus.validReferrals);
        setMilestones(milestoneStatus.milestones);
        setNextTarget(milestoneStatus.nextTarget);
      } else {
        toast({ variant: 'destructive', title: 'Cannot Claim', description: result.message });
      }
    } catch (error) {
      console.error('Error claiming milestone:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to claim reward.' });
    } finally {
      setIsClaiming(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view your referrals.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Referrals
          </CardTitle>
          <CardDescription>
            Track your referral earnings and team members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold">{referralDetails.totalReferrals}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold">₦{referralDetails.totalEarnings.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Wallet className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">With Deposits</p>
                <p className="text-2xl font-bold">{referralDetails.referralsWithDeposits}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <Users className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Without Deposits</p>
                <p className="text-2xl font-bold">{referralDetails.referralsWithoutDeposits}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Referral Event Rewards
          </CardTitle>
          <CardDescription>
            Extra rewards for valid Level 1 users who have deposited and invested at least once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              You have <span className="font-semibold text-primary">{validReferrals}</span> valid referrals.
            </p>
            {nextTarget && (
              <p className="text-xs text-muted-foreground">
                Next reward at <span className="font-semibold">{nextTarget}</span> valid referrals.
              </p>
            )}
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {milestones.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card/40"
              >
                <div>
                  <p className="font-semibold text-sm">
                    {m.id} – {m.target} valid users
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reward: ₦{m.reward.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {m.status === 'claimed' && (
                    <span className="flex items-center text-xs text-green-500">
                      <CheckCircle className="h-4 w-4 mr-1" /> Claimed
                    </span>
                  )}
                  {m.status === 'locked' && (
                    <span className="flex items-center text-xs text-muted-foreground">
                      <Lock className="h-4 w-4 mr-1" /> Locked
                    </span>
                  )}
                  {m.status === 'claimable' && (
                    <button
                      onClick={() => handleClaimMilestone(m)}
                      disabled={isClaiming === m.id}
                      className="px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground disabled:opacity-60"
                    >
                      {isClaiming === m.id ? 'Claiming...' : `Claim ₦${m.reward.toLocaleString()}`}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Referred Users</CardTitle>
          <CardDescription>
            People who registered using your referral code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referralDetails.referrals.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">No referrals yet</p>
              <p className="text-sm">Share your referral code to start earning bonuses!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Deposit Status</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>First Deposit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referralDetails.referrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell className="font-medium">{referral.phone}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(referral.regDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={referral.hasDeposited ? "default" : "secondary"}>
                        {referral.hasDeposited ? "Deposited" : "No Deposit"}
                      </Badge>
                    </TableCell>
                    <TableCell>₦{(referral.balance || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      {referral.hasDeposited && referral.firstDepositDate ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(referral.firstDepositDate).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not yet</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 