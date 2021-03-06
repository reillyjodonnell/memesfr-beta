import React, { useState, useEffect, useContext } from 'react';
import { auth, db, storage } from '../services/firebase';
import { Link, useNavigate } from 'react-router-dom';
import firebase from 'firebase/app';
import CreateProfile from '../components/create-profile';

export async function retrieveProfileData(userID) {
  const userData = await db.collection('usernames').doc(userID);
  const result = await userData.get();
  const userId = result.data();
  const profileData = await db.collection('users').doc(userId.uid);
  const id = userId.uid;
  const profileResult = await profileData.get();
  const profileStats = profileResult.data();
  const profileStatsWithId = { ...profileStats, id };
  return profileStatsWithId;
}

export async function retrievePopularPosts() {
  const popRef = db.collection('popular').doc('top_fifty');
  const collections = await popRef.get();
  const items = collections.data();
  const results = items.posts;

  const updatedObjects = items.posts.map((item) => {
    //For each item look through the shards and tally them up
    const shardRef = db.collection('counters').doc(item.id);
    const totalLikesOnPost = shardRef
      .collection('shards')
      .get()
      .then((snapshot) => {
        let total_count = 0;
        snapshot.forEach((doc) => {
          total_count += doc.data().count;
        });
        return total_count;
      });
    const shardHeartRef = db.collection('heartCounters').doc(item.id);

    //Here we look at the amount of hearts a post has
    const totalHeartsOnPost = shardHeartRef
      .collection('shards')
      .get()
      .then((snapshot) => {
        let total_count = 0;
        snapshot.forEach((doc) => {
          total_count += doc.data().count;
        });
        return total_count;
      });
    totalLikesOnPost.then((resolvedPromiseForNumberOfLikes) => {
      const amountOfLikes = resolvedPromiseForNumberOfLikes;
      return amountOfLikes;
    });
    totalHeartsOnPost.then((resolvedPromiseForNumberOfHearts) => {
      const amountOfHearts = resolvedPromiseForNumberOfHearts;
      return amountOfHearts;
    });
    async function documentData() {
      const usersLikes = await totalLikesOnPost;
      const usersHearts = await totalHeartsOnPost;
      const docData = {
        userName: item.userName,
        title: item.title,
        author: item.author,
        authorPic: item.authorPic,
        likes: usersLikes,
        hearts: usersHearts,
        image: item.image,
        fileType: item.fileType,
        createdAt: item.createdAt,
        id: item.id,
      };
      return docData;
    }

    return documentData();
  });
  return updatedObjects;
}

export async function retrieveRecentPosts() {
  const recentRef = db.collection('recent').doc('recent_fifty');
  const collections = await recentRef.get();
  const items = collections.data();
  const updatedObjects = items.posts.map((item) => {
    //For each item look through the shards and tally them up
    const shardRef = db.collection('counters').doc(item.id);
    const totalLikesOnPost = shardRef
      .collection('shards')
      .get()
      .then((snapshot) => {
        let total_count = 0;
        snapshot.forEach((doc) => {
          total_count += doc.data().count;
        });
        return total_count;
      });
    const shardHeartRef = db.collection('heartCounters').doc(item.id);

    //Here we look at the amount of hearts a post has
    const totalHeartsOnPost = shardHeartRef
      .collection('shards')
      .get()
      .then((snapshot) => {
        let total_count = 0;
        snapshot.forEach((doc) => {
          total_count += doc.data().count;
        });
        return total_count;
      });
    totalLikesOnPost.then((resolvedPromiseForNumberOfLikes) => {
      const amountOfLikes = resolvedPromiseForNumberOfLikes;
      return amountOfLikes;
    });
    totalHeartsOnPost.then((resolvedPromiseForNumberOfHearts) => {
      const amountOfHearts = resolvedPromiseForNumberOfHearts;
      return amountOfHearts;
    });
    async function documentData() {
      const usersLikes = await totalLikesOnPost;
      const usersHearts = await totalHeartsOnPost;
      const docData = {
        userName: item.userName,
        title: item.title,
        author: item.author,
        authorPic: item.authorPic,
        likes: usersLikes,
        hearts: usersHearts,
        image: item.image,
        fileType: item.fileType,
        createdAt: item.createdAt,
        id: item.id,
      };
      return docData;
    }

    return documentData();
  });
  return updatedObjects;

  //updatedObjects is an array of promises. How do we turn each promise into an array with actual values?
}

export async function retrieveRandomMeme() {
  const memes = db.collection('memes');
  const key = memes.doc().id;
  let memeObject = {};
  await memes
    .where(firebase.firestore.FieldPath.documentId(), '>=', key)
    .limit(1)
    .get()
    .then((snapshot) => {
      if (snapshot.size > 0) {
        snapshot.forEach((doc) => {
          //For each item look through the shards and tally them up
          const shardRef = db.collection('counters').doc(doc.data().id);
          const totalLikesOnPost = shardRef
            .collection('shards')
            .get()
            .then((snapshot) => {
              let total_count = 0;
              snapshot.forEach((doc) => {
                total_count += doc.data().count;
              });
              return total_count;
            });
          const shardHeartRef = db
            .collection('heartCounters')
            .doc(doc.data().id);
          const totalHeartsOnPost = shardHeartRef
            .collection('shards')
            .get()
            .then((snapshot) => {
              let total_count = 0;
              snapshot.forEach((doc) => {
                total_count += doc.data().count;
              });
              return total_count;
            });
          totalLikesOnPost.then((resolvedPromiseForNumberOfLikes) => {
            const amountOfLikes = resolvedPromiseForNumberOfLikes;
            return amountOfLikes;
          });
          totalHeartsOnPost.then((resolvedPromiseForNumberOfHearts) => {
            const amountOfHearts = resolvedPromiseForNumberOfHearts;
            return amountOfHearts;
          });

          async function documentData() {
            const usersLikes = await totalLikesOnPost;
            const usersHearts = await totalHeartsOnPost;
            const docData = {
              userName: doc.data().userName,
              title: doc.data().title,
              author: doc.data().author,
              authorPic: doc.data().authorPic,
              likes: usersLikes,
              hearts: usersHearts,
              image: doc.data().image,
              fileType: doc.data().fileType,
              createdAt: doc.data().createdAt,
              id: doc.data().id,
            };
            return docData;
          }
          memeObject = documentData();
        });
        return memeObject;
      } else {
        memes
          .where(firebase.firestore.FieldPath.documentId(), '<', key)
          .limit(1)
          .get()
          .then((snapshot) => {
            snapshot.forEach((doc) => {
              //For each item look through the shards and tally them up
              const shardRef = db.collection('counters').doc(doc.data().id);
              const totalLikesOnPost = shardRef
                .collection('shards')
                .get()
                .then((snapshot) => {
                  let total_count = 0;
                  snapshot.forEach((doc) => {
                    total_count += doc.data().count;
                  });
                  return total_count;
                });
              const shardHeartRef = db
                .collection('heartCounters')
                .doc(doc.data().id);
              const totalHeartsOnPost = shardHeartRef
                .collection('shards')
                .get()
                .then((snapshot) => {
                  let total_count = 0;
                  snapshot.forEach((doc) => {
                    total_count += doc.data().count;
                  });
                  return total_count;
                });
              totalLikesOnPost.then((resolvedPromiseForNumberOfLikes) => {
                const amountOfLikes = resolvedPromiseForNumberOfLikes;
                return amountOfLikes;
              });
              totalHeartsOnPost.then((resolvedPromiseForNumberOfHearts) => {
                const amountOfHearts = resolvedPromiseForNumberOfHearts;
                return amountOfHearts;
              });
              async function documentData() {
                const usersLikes = await totalLikesOnPost;
                const usersHearts = await totalHeartsOnPost;
                const docData = {
                  userName: doc.data().userName,
                  title: doc.data().title,
                  author: doc.data().author,
                  authorPic: doc.data().authorPic,
                  likes: usersLikes,
                  hearts: usersHearts,
                  image: doc.data().image,
                  fileType: doc.data().fileType,
                  createdAt: doc.data().createdAt,
                  id: doc.data().id,
                };
                return docData;
              }
              memeObject = documentData();
            });

            return memeObject;
          });
      }
    })
    .catch((error) => {});
  return memeObject;
}

export const followUser = async (currentUserId, followingUserId) => {
  // Write to the current user's following document
  const userRef = await db.collection('users').doc(currentUserId);
  await userRef.update({
    following: firebase.firestore.FieldValue.arrayUnion(followingUserId),
  });
  //Write to the target user's followers list
  const followingUserRef = await db.collection('users').doc(followingUserId);
  await followingUserRef.update({
    followers: firebase.firestore.FieldValue.arrayUnion(currentUserId),
  });
};

export const unfollowUser = async (currentUserId, followingUserId) => {
  // Write to the current user's following document
  const userRef = await db.collection('users').doc(currentUserId);
  // Removes the followingUserId from the current user's following list
  await userRef.update({
    following: firebase.firestore.FieldValue.arrayRemove(followingUserId),
  });
  // Removes the current user from the followinguser's follower list
  const followingUserRef = await db.collection('users').doc(followingUserId);
  await followingUserRef.update({
    followers: firebase.firestore.FieldValue.arrayRemove(currentUserId),
  });
};

export const retrieveFollowing = async (currentUserId) => {
  const referenceToPost = await db.collection('users').doc(currentUserId);
  const doc = await referenceToPost.get();
  const data = await doc.data();
  console.log(data);
  if (data?.hasOwnProperty('following')) {
    const following = doc.data().following;
    return following;
  } else {
    return null;
  }
};
