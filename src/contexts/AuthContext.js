import React, { useState, useEffect, useContext } from "react";
import { auth, db, storage } from "../services/firebase";
import { useHistory } from "react-router-dom";
import firebase from "firebase/app";
import CreateProfile from "../components/CreateProfile";

const AuthContext = React.createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState();
  const [loadUser, setLoadUser] = useState(true);
  const [userExists, setUserExists] = useState(true);
  const [loadingFilter, setLoadingFilter] = useState(false);
  const [recentlyUploaded, setRecentlyUploaded] = useState([]);
  const [notConfirmedEmail, setNotConfirmedEmail] = useState(false);
  const history = useHistory();

  var actionCodeSettings = {
    url: "https://memesfr.com/",
    handleCodeInApp: true,
  };

  var user = auth.currentUser;

  function signup(email, password) {
    return auth
      .createUserWithEmailAndPassword(email, password)
      .then((userData) => {
        if (userData != null) {
          userData.user.sendEmailVerification();
        }
      })
      .catch((err) => {});
  }

  async function completeSignInWithEmail() {
    // Confirm the link is a sign-in with email link.
    if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
      // Additional state parameters can also be passed via URL.
      // This can be used to continue the user's intended action before triggering
      // the sign-in operation.
      // Get the email if available. This should be available if the user completes
      // the flow on the same device where they started it.
      var email = window.localStorage.getItem("emailForSignIn");
      if (!email) {
      }
      // The client SDK will parse the code from the link for you.
      firebase
        .auth()
        .signInWithEmailLink(email, window.location.href)
        .then((result) => {
          // Clear email from storage.
          window.localStorage.removeItem("emailForSignIn");
          if (result.user) {
            setCurrentUser(result.user);
            history.push({
              pathname: "/setup",
              state: {
                verifiedUser: true,
              },
            });
          }
          // You can access the new user via result.user
          // Additional user info profile not available via:
          // result.additionalUserInfo.profile == null
          // You can check if the user is new or existing:
          // result.additionalUserInfo.isNewUser
        })
        .catch((error) => {
          // Some error occurred, you can inspect the code: error.code
          // Common errors could be invalid email and invalid or expired OTPs.
        });
    }
  }

  function login(email, password) {
    return auth.signInWithEmailAndPassword(email, password);
  }
  function resetPassword(email) {
    history.push("/reset");

    return auth.sendPasswordResetEmail(email);
  }
  function signOut() {
    auth.signOut().then(
      function () {
        history.push("/");
        history.go(0);
      },
      function (error) {}
    );

    //Route to home screen and refresh the page plz
  }

  function uploadMeme(image, title, type) {
    var author = currentUser.uid;
    var ud = currentUser.displayName;
    var userPic = currentUser.photoURL;
    const upload = storage.ref(`memes/${title}`).put(image);
    var num_shards = 5;
    var batch = db.batch();
    upload.on(
      "state_changed",
      (snapshot) => {},
      (error) => {},
      () => {
        //This is 1 write
        storage
          .ref("memes")
          .child(title)
          .getDownloadURL()
          .then((url, id) => {
            //1 read here
            var memeRef = db.collection("memes");
            var uniqueIdentifier = memeRef.doc().id;
            memeRef
              .doc(uniqueIdentifier)
              .set(
                {
                  id: uniqueIdentifier,
                  userName: ud,
                  author: author,
                  authorPic: userPic,
                  image: url,
                  title: title,
                  likes: 0,
                  dislikes: 0,
                  hearts: 0,
                  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                  fileType: type,
                },
                { merge: true }
              )

              .then(() => {
                var userRef = db.collection("users").doc(author);
                batch.set(
                  userRef,
                  {
                    createdPosts: firebase.firestore.FieldValue.arrayUnion(
                      uniqueIdentifier
                    ),
                  },
                  { merge: true }
                );
                var sample = {
                  id: uniqueIdentifier,
                  userName: ud,
                  author: author,
                  authorPic: userPic,
                  image: url,
                  title: title,
                  likes: 0,
                  dislikes: 0,
                  hearts: 0,
                  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                  fileType: type,
                };
                setRecentlyUploaded((prevState) => [sample, ...prevState]);
                var counterRef = db
                  .collection("counters")
                  .doc(uniqueIdentifier);
                // Initialize the counter document
                batch.set(counterRef, { num_shards: num_shards });
                // Initialize each shard with count=0
                for (let i = 0; i < num_shards; i++) {
                  const shardRef = counterRef
                    .collection("shards")
                    .doc(i.toString());
                  batch.set(shardRef, { count: 0 });
                }
                var counterRef = db
                  .collection("heartCounters")
                  .doc(uniqueIdentifier);
                // Initialize the counter document
                batch.set(counterRef, { num_shards: num_shards });
                // Initialize each shard with count=0
                for (let i = 0; i < num_shards; i++) {
                  const shardRef = counterRef
                    .collection("shards")
                    .doc(i.toString());
                  batch.set(shardRef, { count: 0 });
                }

                // Commit the write batch
                batch
                  .commit()
                  .then((res) => {})
                  .catch((err) => {});
              })
              .catch((error) => {});
          });
      }
    );
  }

  async function hasUserLikedPost() {
    var currentUserID = currentUser.uid;
    var referenceToPost = db.collection("users").doc(currentUserID);
    var doc = await referenceToPost.get();
    var likedPosts = doc.data().likedPosts;
    var heartedPosts = doc.data().hearted;
    var distinct = [{ likedPosts }, { heartedPosts }];
    return distinct;
  }

  //Make a call to the firestore and retrieve the documents
  //Map over all of the results and set each one to state
  //At the end of it return the entirety of state
  async function retrieveRecentPosts() {
    setLoadingFilter(true);
    const recentRef = db.collection("recent").doc("recent_fifty");
    const collections = await recentRef.get();
    var items = collections.data();
    var updatedObjects = items.posts.map((item) => {
      //For each item look through the shards and tally them up
      var shardRef = db.collection("counters").doc(item.id);
      var totalLikesOnPost = shardRef
        .collection("shards")
        .get()
        .then((snapshot) => {
          let total_count = 0;
          snapshot.forEach((doc) => {
            total_count += doc.data().count;
          });
          return total_count;
        });
      var shardHeartRef = db.collection("heartCounters").doc(item.id);

      //Here we look at the amount of hearts a post has
      var totalHeartsOnPost = shardHeartRef
        .collection("shards")
        .get()
        .then((snapshot) => {
          let total_count = 0;
          snapshot.forEach((doc) => {
            total_count += doc.data().count;
          });
          return total_count;
        });
      totalLikesOnPost.then((resolvedPromiseForNumberOfLikes) => {
        var amountOfLikes = resolvedPromiseForNumberOfLikes;
        return amountOfLikes;
      });
      totalHeartsOnPost.then((resolvedPromiseForNumberOfHearts) => {
        var amountOfHearts = resolvedPromiseForNumberOfHearts;
        return amountOfHearts;
      });
      async function documentData() {
        var usersLikes = await totalLikesOnPost;
        var usersHearts = await totalHeartsOnPost;
        var docData = {
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

      setLoadingFilter(false);

      return documentData();
    });
    return updatedObjects;

    //updatedObjects is an array of promises. How do we turn each promise into an array with actual values?
  }

  // async function updateLikeCount(id) {
  //   var shardRef = db.collection("counters").doc(id);
  //   var totalLikesOnPost = shardRef
  //     .collection("shards")
  //     .get()
  //     .then((snapshot) => {
  //       let total_count = 0;
  //       snapshot.forEach((doc) => {
  //         total_count += doc.data().count;
  //       });
  //       return total_count;
  //     });
  // }

  async function retrievePopularPosts() {
    setLoadingFilter(true);
    const popRef = db.collection("popular").doc("top_fifty");
    const collections = await popRef.get();
    var items = collections.data();
    var results = items.posts;

    var updatedObjects = items.posts.map((item) => {
      //For each item look through the shards and tally them up
      var shardRef = db.collection("counters").doc(item.id);
      var totalLikesOnPost = shardRef
        .collection("shards")
        .get()
        .then((snapshot) => {
          let total_count = 0;
          snapshot.forEach((doc) => {
            total_count += doc.data().count;
          });
          return total_count;
        });
      var shardHeartRef = db.collection("heartCounters").doc(item.id);

      //Here we look at the amount of hearts a post has
      var totalHeartsOnPost = shardHeartRef
        .collection("shards")
        .get()
        .then((snapshot) => {
          let total_count = 0;
          snapshot.forEach((doc) => {
            total_count += doc.data().count;
          });
          return total_count;
        });
      totalLikesOnPost.then((resolvedPromiseForNumberOfLikes) => {
        var amountOfLikes = resolvedPromiseForNumberOfLikes;
        return amountOfLikes;
      });
      totalHeartsOnPost.then((resolvedPromiseForNumberOfHearts) => {
        var amountOfHearts = resolvedPromiseForNumberOfHearts;
        return amountOfHearts;
      });
      async function documentData() {
        var usersLikes = await totalLikesOnPost;
        var usersHearts = await totalHeartsOnPost;
        var docData = {
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
        console.log(docData);
        return docData;
      }

      setLoadingFilter(false);

      return documentData();
    });
    return updatedObjects;
  }

  async function checkUsernameAvailability(id) {
    var username = id.toLowerCase();
    //Prevent throwing error
    if (user && id.length >= 5) {
      var search = await db.collection("usernames").doc(username).get();
      var exists = search.exists;
      if (exists) {
        return false;
      } else return true;
    }
  }
  //1 read
  function addUsernameToDB(id) {
    var value = user.uid;
    var items = [
      {
        createdPosts: [],
      },
      {
        hearted: [],
      },
      {
        likedPosts: [],
      },
    ];

    db.collection("usernames").doc(id).set({ uid: value });
    db.collection("users").doc(value).set({ items });
  }

  function updateProfile(name, file, defaultAvatar) {
    if (defaultAvatar) {
      addUsernameToDB(name);
      setUserName(name);
      setProfilePicture(file, true);
      history.push("");
    }
    if (!defaultAvatar) {
      addUsernameToDB(name);
      setUserName(name);
      setProfilePicture(file, false);
      history.push("");
    }
  }

  function setUserName(username) {
    currentUser
      .updateProfile({
        displayName: username,
      })
      .then(
        function () {},
        function (error) {}
      );
  }

  function setProfilePicture(file, defaultAvatar) {
    var imageFile;
    var id = user.uid;
    if (defaultAvatar) {
      imageFile = file;
    }
    if (!defaultAvatar) {
      imageFile = URL.createObjectURL(file);
    }

    const upload = storage.ref(`users/${id}`).put(file);
    upload.on(
      "state_changed",
      (snapshot) => {},
      (error) => {},
      () => {
        storage
          .ref("users")
          .child(id)
          .getDownloadURL()
          .then((url) => {
            currentUser.updateProfile({
              photoURL: url,
            });
          });
      }
    );
    currentUser
      .updateProfile({
        photoURL: imageFile,
      })
      .then(
        function () {},
        function (error) {}
      );
  }

  //How do we count the total number of likes on the post?

  async function retrieveRandomMeme() {
    var memes = db.collection("memes");
    var key = memes.doc().id;
    await memes
      .where(firebase.firestore.FieldPath.documentId(), ">=", key)
      .limit(1)
      .get()
      .then((snapshot) => {
        if (snapshot.size > 0) {
          var updatedValue = snapshot.forEach((doc) => {
            //For each item look through the shards and tally them up
            var shardRef = db.collection("counters").doc(doc.data().id);
            var totalLikesOnPost = shardRef
              .collection("shards")
              .get()
              .then((snapshot) => {
                let total_count = 0;
                snapshot.forEach((doc) => {
                  total_count += doc.data().count;
                });
                return total_count;
              });
            var shardHeartRef = db
              .collection("heartCounters")
              .doc(doc.data().id);
            var totalHeartsOnPost = shardHeartRef
              .collection("shards")
              .get()
              .then((snapshot) => {
                let total_count = 0;
                snapshot.forEach((doc) => {
                  total_count += doc.data().count;
                });
                return total_count;
              });
            totalLikesOnPost.then((resolvedPromiseForNumberOfLikes) => {
              var amountOfLikes = resolvedPromiseForNumberOfLikes;
              return amountOfLikes;
            });
            totalHeartsOnPost.then((resolvedPromiseForNumberOfHearts) => {
              var amountOfHearts = resolvedPromiseForNumberOfHearts;
              return amountOfHearts;
            });
            async function documentData() {
              var usersLikes = await totalLikesOnPost;
              var usersHearts = await totalHeartsOnPost;
              var docData = {
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
              console.log(docData);
              return docData;
            }

            setLoadingFilter(false);

            return documentData();
          });
          console.log(updatedValue);
          return updatedValue;
        } else {
          var meme = memes
            .where(firebase.firestore.FieldPath.documentId(), "<", key)
            .limit(1)
            .get()
            .then((snapshot) => {
              var updatedValue = {};
              snapshot.forEach((doc) => {
                //For each item look through the shards and tally them up
                var shardRef = db.collection("counters").doc(doc.data().id);
                var totalLikesOnPost = shardRef
                  .collection("shards")
                  .get()
                  .then((snapshot) => {
                    let total_count = 0;
                    snapshot.forEach((doc) => {
                      total_count += doc.data().count;
                    });
                    return total_count;
                  });
                var updatedMemeObject = totalLikesOnPost
                  .then((resolvedPromiseForNumberOfLikes) => {
                    var docData = {
                      userName: doc.data().userName,
                      title: doc.data().title,
                      author: doc.data().author,
                      authorPic: doc.data().authorPic,
                      likes: resolvedPromiseForNumberOfLikes,
                      image: doc.data().image,
                      createdAt: doc.data().createdAt,
                      id: doc.data().id,
                      fileType: doc.data().fileType,
                    };
                    return docData;
                  })
                  .then((updatedMemeData) => {
                    return updatedMemeData;
                  });
                setLoadingFilter(false);
                updatedValue = updatedMemeObject;
                return updatedMemeObject;
              });
              return updatedValue;
            })
            .catch((error) => {});
        }
      })
      .catch((error) => {});
    return null;
  }
  async function removeHeartPost(postId) {
    var userID = currentUser.uid;
    var num_shards = 5;
    var ref = db.collection("heartCounters").doc(postId);

    //Remove it from the users' liked posts and merge it
    var userRef = db.collection("users").doc(userID);
    await userRef.update({
      hearted: firebase.firestore.FieldValue.arrayRemove(postId),
    });
    const shard_id = Math.floor(Math.random() * num_shards).toString();
    const shard_ref = ref.collection("shards").doc(shard_id);

    shard_ref.update("count", firebase.firestore.FieldValue.increment(-1));
  }
  async function heartPost(postID) {
    var userID = currentUser.uid;
    var num_shards = 5;
    var ref = db.collection("heartCounters").doc(postID);

    //Add it to the users' liked posts and merge it
    var userRef = db.collection("users").doc(userID);
    await userRef.update(
      {
        hearted: firebase.firestore.FieldValue.arrayUnion(postID),
      },
      { merge: true }
    );
    // Select a shard of the counter at random
    const shard_id = Math.floor(Math.random() * num_shards).toString();
    const shard_ref = ref.collection("shards").doc(shard_id);

    // Update count
    shard_ref.update("count", firebase.firestore.FieldValue.increment(1));
  }

  async function removeLikePost(postID) {
    var userID = currentUser.uid;
    var num_shards = 5;
    var ref = db.collection("counters").doc(postID);

    var userRef = db.collection("users").doc(userID);
    await userRef.update({
      likedPosts: firebase.firestore.FieldValue.arrayRemove(postID),
    });

    const shard_id = Math.floor(Math.random() * num_shards).toString();
    const shard_ref = ref.collection("shards").doc(shard_id);

    shard_ref.update("count", firebase.firestore.FieldValue.increment(-1));
  }

  async function likePost(postID) {
    var userID = currentUser.uid;
    var num_shards = 5;
    var ref = db.collection("counters").doc(postID);

    //Add it to the users' liked posts and merge it
    var userRef = db.collection("users").doc(userID);
    await userRef.update(
      {
        likedPosts: firebase.firestore.FieldValue.arrayUnion(postID),
      },
      { merge: true }
    );

    // Select a shard of the counter at random
    const shard_id = Math.floor(Math.random() * num_shards).toString();
    const shard_ref = ref.collection("shards").doc(shard_id);

    // Update count
    shard_ref.update("count", firebase.firestore.FieldValue.increment(1));
  }
  function dislikePost(postID) {
    var userID = currentUser.uid;
    const num_shards = 5;
    var ref = db.collection("counters").doc(postID);

    // Select a shard of the counter at random
    const shard_id = Math.floor(Math.random() * num_shards).toString();
    const shard_ref = ref.collection("shards").doc(shard_id);

    // Update count
    shard_ref.update("count", firebase.firestore.FieldValue.increment(1));

    //Write to the shard
  }

  function sendConfirmationEmail() {
    auth
      .sendSignInLinkToEmail(user.email, actionCodeSettings)
      .then(() => {
        // The link was successfully sent. Inform the user.
        // Save the email locally so you don't need to ask the user for it again
        // if they open the link on the same device.
        window.localStorage.setItem("emailForSignIn", user.email);
      })
      .catch((error) => {
        var errorCode = error.code;
        var errorMessage = error.message;
      });
  }

  useEffect(() => {
    let mount = true;
    if (mount === true) {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          if (user.emailVerified && user.displayName != null) {
            setCurrentUser(user);
          }
          if (user.displayName && !user.emailVerified) {
            setNotConfirmedEmail(true);
          }
          if (user.emailVerified && user.displayName === null) {
            setCurrentUser(user);
            history.push({
              pathname: "/setup",
              state: {
                verifiedUser: true,
              },
            });
          }
        }
        if (!user) {
          history.push("/");
        }

        setLoadUser(false);
      });
      return unsubscribe;
    }
    return () => (mount = false);
  }, []);

  const values = {
    currentUser,
    signup,
    login,
    resetPassword,
    signOut,
    setUserName,
    setProfilePicture,
    uploadMeme,
    checkUsernameAvailability,
    userExists,
    loadUser,
    sendConfirmationEmail,
    addUsernameToDB,
    updateProfile,
    loadingFilter,
    retrievePopularPosts,
    retrieveRecentPosts,
    likePost,
    dislikePost,
    heartPost,
    hasUserLikedPost,
    recentlyUploaded,
    retrieveRandomMeme,
    removeLikePost,
    removeHeartPost,
    completeSignInWithEmail,
    setCurrentUser,
    notConfirmedEmail,
  };
  return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>;
}
