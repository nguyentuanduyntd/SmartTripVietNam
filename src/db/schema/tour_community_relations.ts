import { relations } from "drizzle-orm";
import { cuisines } from "./cuisines";
import { destinations } from "./destinations";
import { locations } from "./locations";
import { profiles } from "./profiles";
import {communityPosts,postComments,postDestinations,postImages,postLikes,} from "./community";
import { TourComment, tourDays, tourItems,tourComments, tourLikes, tourMealCuisines, tourMeals, tours } from "./tours";

export const toursRelations = relations(tours, ({ one, many }) => ({
  startLocation: one(locations, {
    fields: [tours.startLocationId],
    references: [locations.id],
  }),
  creator: one(profiles, {
    fields: [tours.createdBy],
    references: [profiles.id],
  }),
  days: many(tourDays),
  likes: many(tourLikes),
  comments: many(tourComments),
  communityPosts: many(communityPosts),
}));

export const tourDaysRelations = relations(tourDays, ({ one, many }) => ({
  tour: one(tours, {
    fields: [tourDays.tourId],
    references: [tours.id],
  }),
  items: many(tourItems),
  meals: many(tourMeals),
}));

export const tourItemsRelations = relations(tourItems, ({ one }) => ({
  day: one(tourDays, {
    fields: [tourItems.tourDayId],
    references: [tourDays.id],
  }),
  destination: one(destinations, {
    fields: [tourItems.destinationId],
    references: [destinations.id],
  }),
}));

export const tourMealsRelations = relations(tourMeals, ({ one, many }) => ({
  day: one(tourDays, {
    fields: [tourMeals.tourDayId],
    references: [tourDays.id],
  }),
  cuisines: many(tourMealCuisines),
}));

export const tourMealCuisinesRelations = relations(
  tourMealCuisines,
  ({ one }) => ({
    meal: one(tourMeals, {
      fields: [tourMealCuisines.tourMealId],
      references: [tourMeals.id],
    }),
    cuisine: one(cuisines, {
      fields: [tourMealCuisines.cuisineId],
      references: [cuisines.id],
    }),
  }),
);

export const tourLikesRelations = relations(tourLikes, ({ one }) => ({
  tour: one(tours, {
    fields: [tourLikes.tourId],
    references: [tours.id],
  }),
  user: one(profiles, {
    fields: [tourLikes.userId],
    references: [profiles.id],
  }),
}));

export const tourCommentsRelations = relations(
  tourComments,
  ({ one, many }) => ({
    tour: one(tours, {
      fields: [tourComments.tourId],
      references: [tours.id],
    }),
    user: one(profiles, {
      fields: [tourComments.userId],
      references: [profiles.id],
    }),
    parent: one(tourComments, {
      fields: [tourComments.parentId],
      references: [tourComments.id],
      relationName: "tour_comment_replies",
    }),
    replies: many(tourComments, {
      relationName: "tour_comment_replies",
    }),
  }),
);

export const communityPostsRelations = relations(
  communityPosts,
  ({ one, many }) => ({
    user: one(profiles, {
      fields: [communityPosts.userId],
      references: [profiles.id],
    }),
    tour: one(tours, {
      fields: [communityPosts.tourId],
      references: [tours.id],
    }),
    images: many(postImages),
    destinations: many(postDestinations),
    likes: many(postLikes),
    comments: many(postComments),
  }),
);

export const postImagesRelations = relations(postImages, ({ one }) => ({
  post: one(communityPosts, {
    fields: [postImages.postId],
    references: [communityPosts.id],
  }),
}));

export const postDestinationsRelations = relations(
  postDestinations,
  ({ one }) => ({
    post: one(communityPosts, {
      fields: [postDestinations.postId],
      references: [communityPosts.id],
    }),
    destination: one(destinations, {
      fields: [postDestinations.destinationId],
      references: [destinations.id],
    }),
  }),
);

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(communityPosts, {
    fields: [postLikes.postId],
    references: [communityPosts.id],
  }),
  user: one(profiles, {
    fields: [postLikes.userId],
    references: [profiles.id],
  }),
}));

export const postCommentsRelations = relations(
  postComments,
  ({ one, many }) => ({
    post: one(communityPosts, {
      fields: [postComments.postId],
      references: [communityPosts.id],
    }),
    user: one(profiles, {
      fields: [postComments.userId],
      references: [profiles.id],
    }),
    parent: one(postComments, {
      fields: [postComments.parentId],
      references: [postComments.id],
      relationName: "post_comment_replies",
    }),
    replies: many(postComments, {
      relationName: "post_comment_replies",
    }),
  }),
);

