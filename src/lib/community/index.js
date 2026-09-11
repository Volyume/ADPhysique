/**
 * The Community barrel (blueprint section 5).
 *
 * Screens and components import from here, never from a module inside
 * this folder directly, so the surface stays one thing and
 * `transport.js` remains the only route to the network.
 */

export {
  CommunityError, COMMUNITY_ERROR_CODES, isCommunityErrorCode,
  callCommunity, invokeCommunityFunction, assertCommunityGates,
} from './transport';

export {
  HANDLE_REGEX, RESERVED_HANDLES, isValidHandle,
  DISPLAY_NAME_MAX, BIO_MAX, CAPTION_MAX, COMMENT_MAX,
  AREA_LABEL_MAX, GYM_LABEL_MAX, REPORT_DETAIL_MAX, MAX_STYLES_PER_PROFILE,
  SENSITIVE_COMMUNITY_KEYS, POST_PAYLOAD_KEYS, POST_KINDS,
  COMMUNITY_STYLE_KEYS, COMMUNITY_GOALS, COMMUNITY_SETTINGS, REPORT_REASONS,
  PROFILE_VISIBILITIES, POST_VISIBILITIES,
  COMMUNITY_DISCIPLINE_KEYS, COMMUNITY_DISCIPLINE_LABELS, PHYSIQUE_DISCIPLINE_KEYS,
  MAX_DISCIPLINES_PER_PROFILE,
  hasForbiddenKeys, validatePostPayload, cleanText, cleanOptionalText, cleanStyles,
  cleanDisciplines,
} from './validation';

export { BLOCKED_TERMS, foldText, containsBlockedTerm, blockedTermsIn } from './keywordFilter';

export {
  COMMUNITY_RULES_VERSION, COMMUNITY_DIMENSION_MIN_FOR_HUB, NEW_ACCOUNT_DAYS,
  FOLLOWS_PER_DAY_NEW, FOLLOWS_PER_DAY_ESTABLISHED, FOLLOWING_CAP,
  POSTS_PER_DAY_NEW, POSTS_PER_DAY_ESTABLISHED,
  COMMENTS_PER_HOUR_NEW, COMMENTS_PER_HOUR_ESTABLISHED,
  REPORTS_PER_DAY, PROFILE_UPSERTS_PER_DAY,
  HANDLE_CHANGE_DAYS, AUTO_HIDE_REPORTS,
  isNewAccount, limitsForAccount,
} from './limits';

export {
  WEB_ORIGIN, APP_SCHEME, profileUrl, storyUrl, groupUrl,
  appProfileUrl, appStoryUrl, appGroupUrl, parseCommunityLink,
  findHttpsLinks, openMessageLink,
} from './links';

export {
  buildPrPayload, buildSessionPayload, buildBlockPayload,
  buildMilestonePayload,
} from './posts';

export {
  ME_CACHE_PREFIX, meCacheKey, currentUserId, emptyMe, readCachedMe,
  clearCachedMe, loadMe, refreshMe, hasProfile, hasUnseen, hasUnreadMessages,
  upsertProfile, acceptRules,
  checkHandle, suggestHandle, ensureBodyProfilePushed, leaveCommunity, getProfile, follow, unfollow,
  respondToFollow, removeFollower, listFollows, listFollowers,
  setShowGym, setShowPlace, blockUser, unblockUser,
  muteUser, unmuteUser, relationships, setPlace,
  myStatus, isModeratedStatus, setCommunityQuietHours,
} from './profile';

// ─── Onboarding join (communities revamp 2026-09-10, spec section 4.2;
// founder order 2026-09-11, rulings CR-15 / D158) ───────────────────────

export {
  ONBOARDING_CHOICE_PREFIX, PENDING_JOIN_PREFIX, PENDING_JOIN_MAX_AGE_MS,
  onboardingChoiceKey, pendingJoinKey,
  rememberOnboardingChoice, readOnboardingChoice, clearOnboardingChoice,
  writePendingJoin, readPendingJoin, clearPendingJoin,
  performCommunityJoin, retryPendingJoin, applyOnboardingGym,
} from './onboardingJoin';

export { COMMUNITY_RULES_SUMMARY } from './rulesSummary';

export {
  HUB_CACHE_PREFIX, hubCacheKey, clearCachedHub, loadHub, loadFeed,
  loadDiscoverPosts, searchPeople, suggestedPeople,
  loadDimension, loadHubSummary, loadDimensionRecent,
  createPost, deletePost, getPost, reactToPost, setPostNote,
  addComment, deleteComment, listComments,
} from './feed';

export {
  loadActivity, markActivitySeen, pendingRequestsFrom, pendingFollowRequests,
} from './activity';

export {
  MODERATION_ACTIONS, REPORT_TARGET_KINDS, reportContent, isModerator,
  moderationQueue, moderate,
} from './moderation';

export { COMMUNITY_NOTIFY_KINDS, notifyCommunityEvent } from './notify';

// ─── Discovery, connections and the social graph (blueprint 70) ───────

export {
  TP_DAYS, TP_TIME_BANDS, TP_SESSIONS_BANDS, TP_SESSIONS_BAND_ORDER,
  TP_EXPERIENCE_BANDS, TP_AGE_BANDS,
  TP_DEFAULT_SHARE, TP_SHARE_KEYS, TP_WINDOW_WEEKS, TP_MAX_STAPLE_LIFTS,
  TP_MAX_TIME_BANDS, TP_DAY_SHARE, TP_DAY_MIN_SESSIONS, TP_TIME_BAND_SHARE,
  TP_SHARE_PREFIX, TP_SYNCED_PREFIX, TP_SYNC_INTERVAL_MS,
  SESSIONS_AUDIENCE_VALUES, SESSIONS_AUDIENCE_LABELS, DEFAULT_SESSIONS_AUDIENCE,
  tpShareKey, tpSyncedKey, timeBandForHour, experienceBand, sessionsBandFor,
  deriveTrainingProfile, dayListLabel, timeBandsLabel, previewLine,
  readShareSettings, writeShareSettings, shareablePayload,
  loadTrainingProfile, syncTrainingProfile, clearTrainingProfileState,
} from './trainingProfile';

export {
  NO_PLAN_CONSISTENT_THRESHOLD, PLANNED_WINDOW_WEEKS, CONSISTENT_WINDOW_WEEKS,
  computeConsistency, loadConsistency, consistencyGateState, sessionShareGateState,
  publishConsistency, publishSharingSettings,
  CONSISTENCY_WEEK_KEY_PREFIX, publishConsistencyOnForeground,
  SHARING_PUBLISH_PENDING_PREFIX, setSharingPublishPending, retryPendingSharingPublish,
} from './trainingConsistency';

export {
  PENDING_ITEMS_KEY, MAX_AUTO_PRS, publishAmbientItems, flushPendingAmbientItems,
  clearPendingAmbientItems, shareOfferSeenKey, hasSeenSessionShareOffer,
  recordSessionShareOfferSeen,
} from './ambient';

export {
  respectGivenKey, lastRespectGivenState, recordRespectGiven, respectAll,
  clearRespectGivenState,
} from './respect';

export {
  CONNECT_REASONS, CONNECT_REASON_KEYS, MAX_CONNECT_REASONS, CONNECT_NOTE_MAX,
  CONNECT_FROM_VALUES, CONNECTION_STATES, CONNECT_BUTTON_LABELS,
  connectionState, cleanReasons, cleanPartnerPrefs,
  connect, respondToConnect, withdrawConnect, removeConnection,
  listConnections, setConnectFrom, setPartner,
} from './connections';

export {
  MESSAGE_MAX, MESSAGE_REF_KINDS, placeholderFor,
  listConversations, listMessages, sendMessage, markRead, deleteMessage,
  SESSION_DAYS, SESSION_TIME_BANDS, sessionTileLine, sessionStateLine,
  buildSessionRefPayload, respondSession,
} from './messages';

export {
  FIND_MODES, FIND_MODE_ORDER, doorsFor, doorLine, doorZeroState,
  findPeople, gymSummary, gymSuggest,
  FILTER_SCOPES, PLACE_BAND_MILES, PLACE_BAND_LABELS,
  normaliseFilters, filterChips, removeFilterChip, peopleCountLine,
} from './findPeople';

export { REASON_TOKENS, reasonCopy, reasonLines } from './reasons';

export {
  rankPeople, loadRecentPeopleSearches, recordPeopleSearch,
  clearRecentPeopleSearches, RECENT_SEARCHES_MAX,
} from './rankPeople';

export {
  DEFAULT_PAGE_SIZE as BOARD_PAGE_SIZE,
  BOARD_SCOPES, BOARD_SCOPE_ORDER, BOARD_WINDOWS, BOARD_WINDOW_ORDER,
  loadBoard, metricLabel, daysLabel,
} from './boards';

// ─── Groups (community product audit 60 §3; lane B2b) ─────────────────

export {
  GROUP_NAME_MAX, GROUP_BLURB_MAX, GROUP_ACCESS, GROUP_ACCESS_ORDER,
  createGroup, updateGroup, closeGroup, leaveGroup, joinGroup,
  approveGroupRequest, removeGroupMember, promoteGroupMember,
  inviteToGroup, createGroupInviteLink, acceptGroupInvite,
  listMyGroups, getGroup, listGroupMembers, searchGroups, loadGroupFeed,
  togetherLine,
} from './groups';
