import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Flame,
  Globe,
  Heart,
  Info,
  LogOut,
  MapPin,
  MessageSquare,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import type { BadgeVariant } from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import LinkButton from "../../components/ui/LinkButton";
import { findDirectoryEntry } from "../../data/businessData";
import type { Group } from "../../domain/types";
import { useAppState, useGroup } from "../../store/selectors";
import { useAppStore } from "../../store/context";
import { getParticipantIdentity } from "./participantIdentity";

interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "Host" | "Member" | "Community Lead";
  avatarBg: string;
  time: string;
  title?: string;
  content: string;
  likes: number;
  liked: boolean;
  comments: {
    id: string;
    author: string;
    text: string;
    time: string;
  }[];
  isPinned?: boolean;
}

interface GroupEvent {
  id: string;
  title: string;
  dateBadge: { month: string; day: string };
  time: string;
  location: string;
  isOnline?: boolean;
  description: string;
  attendeesCount: number;
  userAttending: boolean;
}

interface GroupPerk {
  id: string;
  title: string;
  provider: string;
  discount: string;
  code: string;
  description: string;
  expires: string;
}

export default function ParticipantGroupPage() {
  const { groupId } = useParams();
  const group = useGroup(groupId);
  const state = useAppState();
  const { dispatch } = useAppStore();
  const identity = getParticipantIdentity();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = group ? `CHS Groups | ${group.name}` : "CHS Groups | Group Details";
  }, [group]);

  const [activeTab, setActiveTab] = useState<"feed" | "events" | "perks" | "members" | "about">("feed");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Post Composer State
  const [newPostText, setNewPostText] = useState("");
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Member Search State
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  // Initial Seeded Posts
  const [posts, setPosts] = useState<CommunityPost[]>([
    {
      id: "post-pin-1",
      authorId: group?.ownerId || "owner-1",
      authorName: group?.ownerName || "Community Host",
      authorRole: "Host",
      avatarBg: "bg-gold-500/20 text-gold-300 border-gold-500/40",
      time: "Pinned Announcement · 2 days ago",
      title: "Welcome to our community group!",
      content:
        "We are thrilled to welcome all new and returning members! This group is dedicated to sharing community updates, local activities, and exclusive benefits. Feel free to introduce yourself below and join our upcoming discussions.",
      likes: 24,
      liked: false,
      isPinned: true,
      comments: [
        {
          id: "c-1",
          author: "Sarah Jenkins",
          text: "So excited to connect with everyone in the local area!",
          time: "Yesterday",
        },
        {
          id: "c-2",
          author: "Marcus Vance",
          text: "Looking forward to the upcoming events schedule.",
          time: "4 hours ago",
        },
      ],
    },
    {
      id: "post-2",
      authorId: "c-005",
      authorName: "Elena Rostova",
      authorRole: "Member",
      avatarBg: "bg-sky-500/20 text-sky-300 border-sky-500/40",
      time: "5 hours ago",
      content:
        "Quick question for the group: Is anyone heading to the upcoming Community Showcase next weekend? Would love to coordinate a coffee meetup beforehand!",
      likes: 8,
      liked: false,
      comments: [
        {
          id: "c-3",
          author: "David Chen",
          text: "Count me in! The central cafe nearby has great seating.",
          time: "2 hours ago",
        },
      ],
    },
    {
      id: "post-3",
      authorId: "c-011",
      authorName: "Amara Patel",
      authorRole: "Community Lead",
      avatarBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      time: "1 day ago",
      title: "Local Partner Discount Updated",
      content:
        "Check out the Perks tab above! Our local partners have just renewed member discounts for the coming month. Show your group membership badge in-store to claim your perks.",
      likes: 19,
      liked: false,
      comments: [],
    },
  ]);

  // Seeded Upcoming Events
  const [events, setEvents] = useState<GroupEvent[]>([
    {
      id: "evt-1",
      title: "Community Meetup & Coffee Morning",
      dateBadge: { month: "OCT", day: "25" },
      time: "Saturday, 10:30 AM – 12:30 PM",
      location: group?.location?.city ? `${group.location.city} Central Hub, Lounge 2` : "Central Hub Community Space",
      description: "An informal morning gathering to meet fellow members, discuss local happenings, and enjoy refreshments.",
      attendeesCount: 16,
      userAttending: true,
    },
    {
      id: "evt-2",
      title: "Seasonal Showcase & Product Preview",
      dateBadge: { month: "NOV", day: "08" },
      time: "Friday, 2:00 PM – 4:00 PM",
      location: "Interactive Online Broadcast",
      isOnline: true,
      description: "A digital walkthrough highlighting special member offers, seasonal collections, and Q&A with group leaders.",
      attendeesCount: 38,
      userAttending: false,
    },
    {
      id: "evt-3",
      title: "Neighborhood Walk & Local Business Tour",
      dateBadge: { month: "NOV", day: "22" },
      time: "Saturday, 11:00 AM – 1:00 PM",
      location: group?.location?.city ? `${group.location.city} High Street` : "Main Square",
      description: "Guided local walking tour visiting participating local community businesses with special tastings and discounts.",
      attendeesCount: 22,
      userAttending: false,
    },
  ]);

  // Seeded Exclusive Perks
  const perks: GroupPerk[] = useMemo(() => [
    {
      id: "prk-1",
      title: "15% Off In-Store Purchases",
      provider: group?.ownerName || "Partner Business",
      discount: "15% OFF",
      code: "CHS15MEMBER",
      description: "Valid on all items at the registered location. Simply present your member badge or quote code at checkout.",
      expires: "Valid through Nov 30, 2026",
    },
    {
      id: "prk-2",
      title: "Free Guest Pass for Upcoming Expo",
      provider: "Central Hub Events",
      discount: "100% OFF",
      code: "EXPO-COMMUNITY-FREE",
      description: "Exclusive complimentary admission ticket to the seasonal trade and community expo.",
      expires: "Valid for single entry",
    },
    {
      id: "prk-3",
      title: "Complimentary Hot Beverage",
      provider: "Local Cafe Partners",
      discount: "FREE DRINK",
      code: "MORNING-COFFEE",
      description: "Enjoy one complimentary tea or artisan coffee during official group meetup hours.",
      expires: "Valid during group meetups",
    },
  ], [group?.ownerName]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  if (!group) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          title="Group not found"
          description="This group does not exist in the demo store, or it was removed."
          icon={<ShieldCheck className="size-6" />}
          action={
            <LinkButton to="/participant/my-groups" variant="outline" size="sm">
              Back to My Groups
            </LinkButton>
          }
        />
      </div>
    );
  }

  const isMember = group.memberIds.includes(identity.id) || group.ownerId === identity.id;

  // Pending invitation for this group
  const pendingInvitation = state.invitations.find(
    (entry) =>
      entry.groupId === group.id &&
      entry.status === "pending" &&
      (entry.inviteeId === identity.id || entry.claimedByAccountId === identity.id)
  );

  const handleAcceptInvite = () => {
    if (pendingInvitation) {
      dispatch({
        type: "invitation/respond",
        invitationId: pendingInvitation.id,
        accept: true,
        responder: { id: identity.id, name: identity.name },
      });
      showToast("Invitation accepted! You are now a member.");
    } else {
      dispatch({
        type: "group/join",
        groupId: group.id,
        actor: { id: identity.id, name: identity.name },
      });
      showToast("You have joined this group!");
    }
  };

  const handleLeaveGroup = () => {
    if (window.confirm(`Are you sure you want to leave "${group.name}"?`)) {
      dispatch({
        type: "group/leave",
        groupId: group.id,
        actor: { id: identity.id, name: identity.name },
      });
      navigate("/participant/my-groups");
    }
  };

  // Like a post
  const handleLikePost = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const nextLiked = !p.liked;
          return {
            ...p,
            liked: nextLiked,
            likes: nextLiked ? p.likes + 1 : p.likes - 1,
          };
        }
        return p;
      })
    );
  };

  // Submit new post
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    setIsSubmittingPost(true);
    const newEntry: CommunityPost = {
      id: `post-${Date.now()}`,
      authorId: identity.id,
      authorName: identity.name,
      authorRole: "Member",
      avatarBg: "bg-gold-500/20 text-gold-300 border-gold-500/40",
      time: "Just now",
      content: newPostText.trim(),
      likes: 0,
      liked: false,
      comments: [],
    };

    setPosts([newEntry, ...posts]);
    setNewPostText("");
    setIsSubmittingPost(false);
    showToast("Post shared with the group!");
  };

  // Toggle Event RSVP
  const handleToggleEventRsvp = (eventId: string) => {
    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id === eventId) {
          const nextAttending = !evt.userAttending;
          return {
            ...evt,
            userAttending: nextAttending,
            attendeesCount: nextAttending ? evt.attendeesCount + 1 : evt.attendeesCount - 1,
          };
        }
        return evt;
      })
    );
    showToast("Event attendance updated!");
  };

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return group.memberIds
      .map((id) => {
        const entry = findDirectoryEntry(id);
        const account = state.accounts.find((row) => row.id === id);
        const name = account?.name ?? entry.name;
        const isOwner = id === group.ownerId;
        const isSelf = id === identity.id;
        const city = entry.city || group.location?.city || "United Kingdom";
        return {
          id,
          name,
          isOwner,
          isSelf,
          city,
        };
      })
      .filter((m) =>
        m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        m.city.toLowerCase().includes(memberSearchQuery.toLowerCase())
      );
  }, [group.memberIds, group.ownerId, group.location?.city, identity.id, state.accounts, memberSearchQuery]);

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed right-5 top-5 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2.5 text-xs font-semibold text-emerald-200 shadow-xl backdrop-blur-md">
          <CheckCircle2 className="size-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Back Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/participant/my-groups"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-3.5" /> Back to My Groups
        </Link>
        <span className="text-[11px] text-slate-500">
          Consumer Member View &bull; Read-Only Governance
        </span>
      </div>

      {/* Invitation Alert Banner if not a member yet */}
      {!isMember && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-500/40 bg-gold-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/20 text-gold-300">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-gold-200">
                {pendingInvitation
                  ? "You have been invited to join this group!"
                  : "Previewing community group"}
              </p>
              <p className="text-[11px] text-slate-300">
                {pendingInvitation
                  ? `Invited by ${group.ownerName}. Join to unlock community discussions, events and deals.`
                  : "Join this group to participate in discussions and unlock member perks."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAcceptInvite}
            className="cursor-pointer rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-ink-950 transition-colors hover:bg-gold-400"
          >
            {pendingInvitation ? "Accept & Join Group" : "Join Group Now"}
          </button>
        </div>
      )}

      {/* Group Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-ink-900/90 via-ink-900/70 to-gold-500/[0.08] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-gold-500/30 bg-gradient-to-br from-gold-500/20 to-amber-600/20 text-xl font-bold text-gold-300 shadow-inner">
              {group.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="gold">{group.type}</Badge>
                <Badge variant={statusVariant(group.status)}>{group.status}</Badge>
                {group.location?.city && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
                    <MapPin className="size-3 text-gold-400" /> {group.location.city}
                  </span>
                )}
                {isMember && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    <Check className="size-2.5" /> Joined
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-xl font-extrabold text-white sm:text-2xl tracking-tight">
                {group.name}
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Organized by <span className="font-semibold text-slate-200">{group.ownerName}</span> &bull;{" "}
                <span className="text-slate-400">{group.memberIds.length} members</span>
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                showToast("Group link copied to clipboard!");
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10"
            >
              <Share2 className="size-3.5" /> Share
            </button>
            {isMember && (
              <button
                type="button"
                onClick={handleLeaveGroup}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <LogOut className="size-3.5" /> Leave
              </button>
            )}
          </div>
        </div>

        {/* Group Purpose Description */}
        <p className="mt-4 border-t border-white/10 pt-3.5 text-xs leading-relaxed text-slate-300">
          {group.purpose}
        </p>

        {/* Quick Highlights Bar */}
        <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Globe className="size-3.5 text-emerald-400" /> {group.accessType} access
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-gold-400" />
            {group.pricing === "paid" && group.contribution
              ? `£${group.contribution} per member`
              : "Free community group"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5 text-sky-400" /> Active since {group.createdAt}
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("feed")}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-1 ${
            activeTab === "feed"
              ? "border-gold-500 text-gold-300"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <MessageSquare className="size-4" /> Community Feed
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("events")}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-1 ${
            activeTab === "events"
              ? "border-gold-500 text-gold-300"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Calendar className="size-4" /> Events &amp; Meetups
          <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-slate-300">
            {events.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("perks")}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-1 ${
            activeTab === "perks"
              ? "border-gold-500 text-gold-300"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Tag className="size-4" /> Exclusive Perks
          <span className="rounded-full bg-gold-500/20 px-1.5 py-0.2 text-[10px] text-gold-300">
            {perks.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-1 ${
            activeTab === "members"
              ? "border-gold-500 text-gold-300"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Users className="size-4" /> Members ({group.memberIds.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("about")}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-1 ${
            activeTab === "about"
              ? "border-gold-500 text-gold-300"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Info className="size-4" /> About &amp; Host
        </button>
      </div>

      {/* Tab 1: Community Feed */}
      {activeTab === "feed" && (
        <div className="flex flex-col gap-4">
          {/* Create Post Composer */}
          <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
            <form onSubmit={handleCreatePost} className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold-500/15 text-gold-400 font-bold text-xs">
                  {identity.name.slice(0, 1)}
                </div>
                <textarea
                  rows={2}
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  placeholder={`Share an update or question with ${group.name}...`}
                  className="w-full resize-none rounded-xl border border-white/10 bg-ink-950 p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-gold-500/50"
                />
              </div>
              <div className="flex items-center justify-between border-t border-white/5 pt-2">
                <span className="text-[11px] text-slate-500">
                  Visible to all group members
                </span>
                <button
                  type="submit"
                  disabled={!newPostText.trim() || isSubmittingPost}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gold-500 px-4 py-1.5 text-xs font-bold text-ink-950 transition-colors hover:bg-gold-400 disabled:opacity-40"
                >
                  <Send className="size-3" /> Post Update
                </button>
              </div>
            </form>
          </div>

          {/* Posts Stream */}
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className={`flex flex-col gap-3 rounded-2xl border p-4.5 transition-all ${
                  post.isPinned
                    ? "border-gold-500/30 bg-gold-500/[0.04]"
                    : "border-white/10 bg-ink-900/50"
                }`}
              >
                {/* Author and timestamp header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl border font-bold text-xs ${post.avatarBg}`}
                    >
                      {post.authorName.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white">{post.authorName}</p>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${
                            post.authorRole === "Host"
                              ? "bg-gold-500/20 text-gold-300"
                              : "bg-white/10 text-slate-400"
                          }`}
                        >
                          {post.authorRole}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">{post.time}</p>
                    </div>
                  </div>

                  {post.isPinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gold-400">
                      <Flame className="size-3" /> Pinned
                    </span>
                  )}
                </div>

                {/* Post body */}
                {post.title && (
                  <h3 className="text-sm font-bold text-white">{post.title}</h3>
                )}
                <p className="text-xs leading-relaxed text-slate-300">{post.content}</p>

                {/* Actions: Likes & Comments */}
                <div className="flex items-center gap-4 border-t border-white/5 pt-2.5 text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => handleLikePost(post.id)}
                    className={`inline-flex cursor-pointer items-center gap-1.5 transition-colors ${
                      post.liked ? "font-bold text-rose-400" : "hover:text-white"
                    }`}
                  >
                    <Heart
                      className={`size-4 ${post.liked ? "fill-rose-400 text-rose-400" : ""}`}
                    />
                    <span>{post.likes}</span>
                  </button>
                  <span className="inline-flex items-center gap-1.5">
                    <MessageSquare className="size-4" />
                    <span>{post.comments.length} comments</span>
                  </span>
                </div>

                {/* Comments list if any */}
                {post.comments.length > 0 && (
                  <div className="flex flex-col gap-2 rounded-xl bg-ink-950/50 p-3">
                    {post.comments.map((c) => (
                      <div key={c.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">{c.author}</span>
                          <span className="text-[10px] text-slate-500">{c.time}</span>
                        </div>
                        <p className="mt-0.5 text-slate-400">{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Events & Meetups */}
      {activeTab === "events" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Upcoming Group Events</h2>
            <span className="text-xs text-slate-400">{events.length} planned</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-ink-900/60 p-4.5 transition-all hover:border-gold-500/30"
              >
                <div>
                  <div className="flex items-start gap-3">
                    {/* Date badge */}
                    <div className="flex flex-col items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-center">
                      <span className="text-[10px] font-bold text-gold-400 tracking-wider">
                        {evt.dateBadge.month}
                      </span>
                      <span className="text-base font-extrabold text-white">
                        {evt.dateBadge.day}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-white">{evt.title}</h3>
                      <p className="mt-0.5 text-[11px] text-slate-400">{evt.time}</p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                        <MapPin className="size-3 text-gold-400" />
                        {evt.location}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-slate-300">
                    {evt.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-[11px] text-slate-400">
                    <Users className="inline size-3 mr-1" /> {evt.attendeesCount} attending
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleEventRsvp(evt.id)}
                    className={`cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                      evt.userAttending
                        ? "border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                        : "bg-gold-500 text-ink-950 hover:bg-gold-400"
                    }`}
                  >
                    {evt.userAttending ? "Attending ✓" : "RSVP to Event"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Exclusive Perks & Deals */}
      {activeTab === "perks" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Member Perks &amp; Deals</h2>
              <p className="text-xs text-slate-400">
                Special offers and discounts provided by {group.ownerName} and partners.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {perks.map((perk) => (
              <div
                key={perk.id}
                className="flex flex-col justify-between rounded-2xl border border-gold-500/30 bg-gradient-to-b from-ink-900/80 to-gold-500/[0.05] p-4.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg bg-gold-500/20 border border-gold-500/40 px-2 py-0.5 text-xs font-extrabold text-gold-300">
                      {perk.discount}
                    </span>
                    <span className="text-[10px] text-slate-500">Member Exclusive</span>
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-white">{perk.title}</h3>
                  <p className="mt-0.5 text-[11px] text-gold-300/80">{perk.provider}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    {perk.description}
                  </p>
                </div>

                <div className="mt-4 border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="rounded bg-ink-950 px-2 py-1 font-mono text-[11px] text-gold-300 select-all border border-white/10">
                      {perk.code}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(perk.code);
                        showToast(`Coupon code ${perk.code} copied!`);
                      }}
                      className="cursor-pointer text-xs font-semibold text-gold-400 hover:text-gold-300"
                    >
                      Copy Code
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">{perk.expires}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Members Directory */}
      {activeTab === "members" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Search group members by name or city..."
                className="w-full rounded-xl border border-white/10 bg-ink-900/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-gold-500/50"
              />
            </div>
            <span className="text-xs text-slate-400">
              Showing {filteredMembers.length} of {group.memberIds.length} members
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-900/50 p-3 transition-colors hover:border-gold-500/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink-950 font-bold text-xs text-gold-400 border border-white/10">
                      {member.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-ink-950" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white">
                      {member.name} {member.isSelf && <span className="text-gold-300">(you)</span>}
                    </p>
                    <p className="text-[10px] text-slate-400">{member.city}</p>
                  </div>
                </div>

                <Badge variant={member.isOwner ? "gold" : "muted"}>
                  {member.isOwner ? "Host" : "Member"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: About & Host Info */}
      {activeTab === "about" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Host Card */}
          <Card>
            <CardBody className="flex flex-col gap-3">
              <CardTitle>Group Organizer &amp; Host</CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-gold-500/20 text-gold-300 font-bold text-base border border-gold-500/30">
                  {group.ownerName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{group.ownerName}</p>
                  <p className="text-xs text-slate-400">Community Group Host</p>
                  {group.location?.city && (
                    <p className="text-[11px] text-gold-300/90">{group.location.city}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hosting this community group on Central Hub Solution to foster local connections, share news, and provide member benefits.
              </p>
            </CardBody>
          </Card>

          {/* Guidelines Card */}
          <Card>
            <CardBody className="flex flex-col gap-3">
              <CardTitle>Community Guidelines</CardTitle>
              <ul className="flex flex-col gap-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-3.5 text-gold-400 shrink-0" />
                  <span>Respectful and welcoming communication at all times.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-3.5 text-gold-400 shrink-0" />
                  <span>No unauthorized commercial spam or unapproved sales pitches.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-3.5 text-gold-400 shrink-0" />
                  <span>Privacy first: keep fellow member discussions inside the group.</span>
                </li>
              </ul>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

function statusVariant(status: Group["status"]): BadgeVariant {
  if (status === "Active") return "success";
  if (status === "Recruiting") return "info";
  if (status === "Suspended" || status === "Closed") return "danger";
  return "warning";
}
