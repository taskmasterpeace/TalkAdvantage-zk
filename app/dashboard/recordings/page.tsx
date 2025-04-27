import { createServerClient } from "@/lib/supabase/server"
import { RecordingsList } from "@/components/recordings-list"
import { DashboardHeader } from "@/components/dashboard-header"

export default async function RecordingsPage() {
  const supabase = createServerClient()

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div>Please sign in to view your recordings</div>
  }

  // Fetch recordings for the current user
  const { data: recordings, error } = await supabase
    .from("recordings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching recordings:", error)
    return <div>Error loading recordings</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DashboardHeader title="Your Recordings" description="View and manage your meeting recordings" />
      <RecordingsList recordings={recordings || []} />
    </div>
  )
}
