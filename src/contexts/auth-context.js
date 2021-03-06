import React, { useState, useEffect, useContext } from 'react';
import { auth, db, storage } from '../services/firebase';
import { Link, useNavigate } from 'react-router-dom';
import firebase from 'firebase/app';
import CreateProfile from '../components/create-profile';

const AuthContext = React.createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children, setLoading }) {
  const [currentUser, setCurrentUser] = useState();
  const [loadUser, setLoadUser] = useState(true);
  const [userExists, setUserExists] = useState(true);
  const [recentlyUploaded, setRecentlyUploaded] = useState([]);
  const [notConfirmedEmail, setNotConfirmedEmail] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);

  const actionCodeSettings = {
    url: 'https://memesfr.com/',
    handleCodeInApp: true,
  };

  let navigate = useNavigate();

  const user = auth.currentUser;

  function signup(email, password) {
    return auth
      .createUserWithEmailAndPassword(email, password)
      .then((userData) => {
        if (userData != null) {
          userData.user.sendEmailVerification();
        }
      })
      .catch((err) => {
        return err.message;
      });
  }

  async function completeSignInWithEmail() {
    // Confirm the link is a sign-in with email link.
    if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
      // Additional state parameters can also be passed via URL.
      // This can be used to continue the user's intended action before triggering
      // the sign-in operation.
      // Get the email if available. This should be available if the user completes
      // the flow on the same device where they started it.
      const email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
      }
      // The client SDK will parse the code from the link for you.
      firebase
        .auth()
        .signInWithEmailLink(email, window.location.href)
        .then((result) => {
          // Clear email from storage.
          window.localStorage.removeItem('emailForSignIn');
          if (result.user) {
            setCurrentUser(result.user);
            navigate('/setup');
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
  function resetPassword() {
    navigate('/reset');
    return auth.sendPasswordResetEmail(user.email);
  }
  function signOut() {
    auth.signOut().then(
      function () {
        navigate('/');
        window.location.reload();
      },
      function (error) {}
    );

    //Route to home screen and refresh the page plz
  }

  function uploadMeme(image, title, type) {
    const author = currentUser.uid;
    const ud = currentUser.displayName;
    const userPic = currentUser.photoURL;
    const upload = storage.ref(`memes/${title}`).put(image);
    const num_shards = 5;
    const batch = db.batch();
    upload.on(
      'state_changed',
      (snapshot) => {},
      (error) => {},
      () => {
        //This is 1 write
        storage
          .ref('memes')
          .child(title)
          .getDownloadURL()
          .then((url, id) => {
            //1 read here
            const memeRef = db.collection('memes');
            const uniqueIdentifier = memeRef.doc().id;
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
                const userRef = db.collection('users').doc(author);
                batch.set(
                  userRef,
                  {
                    createdPosts:
                      firebase.firestore.FieldValue.arrayUnion(
                        uniqueIdentifier
                      ),
                  },
                  { merge: true }
                );
                const sample = {
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
                const counterRef = db
                  .collection('counters')
                  .doc(uniqueIdentifier);
                // Initialize the counter document
                batch.set(counterRef, { num_shards: num_shards });
                // Initialize each shard with count=0
                for (let i = 0; i < num_shards; i++) {
                  const shardRef = counterRef
                    .collection('shards')
                    .doc(i.toString());
                  batch.set(shardRef, { count: 0 });
                }
                const counterRefHeart = db
                  .collection('heartCounters')
                  .doc(uniqueIdentifier);
                // Initialize the counter document
                batch.set(counterRefHeart, { num_shards: num_shards });
                // Initialize each shard with count=0
                for (let i = 0; i < num_shards; i++) {
                  const shardRef = counterRefHeart
                    .collection('shards')
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
    if (currentUser) {
      const currentUserID = currentUser.uid;
      const referenceToPost = db.collection('users').doc(currentUserID);
      const doc = await referenceToPost.get();
      const likedPosts = doc.data().likedPosts;
      const heartedPosts = doc.data().hearted;
      const distinct = [{ likedPosts }, { heartedPosts }];
      return distinct;
    } else return null;
  }

  //Make a call to the firestore and retrieve the documents
  //Map over all of the results and set each one to state
  //At the end of it return the entirety of state

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

  async function checkUsernameAvailability(id) {
    const username = id.toLowerCase();
    //Prevent throwing error
    if (user && id.length >= 5) {
      const search = await db.collection('usernames').doc(username).get();
      const exists = search.exists;
      if (exists) {
        return false;
      } else return true;
    }
  }
  //1 read
  function addUsernameToDB(id) {
    const value = user.uid;
    const items = [
      {
        createdPosts: [],
      },
      {
        hearted: [],
      },
      {
        likedPosts: [],
      },
      {
        photoURL: user.photoURL,
      },
      {
        userName: id,
      },
      {
        crowns: 0,
      },
      {
        followers: [],
      },
    ];

    db.collection('usernames').doc(id).set({ uid: value });
    db.collection('users').doc(value).set({ items });
  }

  function updateProfile(name, file, defaultAvatar) {
    if (defaultAvatar) {
      addUsernameToDB(name);
      setUserName(name);
      setProfilePicture(file, true);
      navigate('/');
    }
    if (!defaultAvatar) {
      addUsernameToDB(name);
      setUserName(name);
      setProfilePicture(file, false);
      navigate('/');
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
    let imageFile;
    const id = user.uid;
    if (defaultAvatar) {
      imageFile = file;
    }
    if (!defaultAvatar) {
      imageFile = URL.createObjectURL(file);
    }

    const upload = storage.ref(`users/${id}`).put(file);
    upload.on(
      'state_changed',
      (snapshot) => {},
      (error) => {},
      () => {
        storage
          .ref('users')
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

  async function removeHeartPost(postId) {
    const userID = currentUser.uid;
    const num_shards = 5;
    const ref = db.collection('heartCounters').doc(postId);

    //Remove it from the users' liked posts and merge it
    const userRef = db.collection('users').doc(userID);
    await userRef.update({
      hearted: firebase.firestore.FieldValue.arrayRemove(postId),
    });
    const shard_id = Math.floor(Math.random() * num_shards).toString();
    const shard_ref = ref.collection('shards').doc(shard_id);

    shard_ref.update('count', firebase.firestore.FieldValue.increment(-1));
  }
  async function heartPost(postID) {
    const userID = currentUser.uid;
    const num_shards = 5;
    const ref = db.collection('heartCounters').doc(postID);

    //Add it to the users' liked posts and merge it
    const userRef = db.collection('users').doc(userID);
    await userRef.update(
      {
        hearted: firebase.firestore.FieldValue.arrayUnion(postID),
      },
      { merge: true }
    );
    // Select a shard of the counter at random
    const shard_id = Math.floor(Math.random() * num_shards).toString();
    const shard_ref = ref.collection('shards').doc(shard_id);

    // Update count
    shard_ref.update('count', firebase.firestore.FieldValue.increment(1));
  }

  async function removeLikePost(postID) {
    const userID = currentUser.uid;
    const num_shards = 5;
    const ref = db.collection('counters').doc(postID);

    const userRef = db.collection('users').doc(userID);
    await userRef.update({
      likedPosts: firebase.firestore.FieldValue.arrayRemove(postID),
    });

    const shard_id = Math.floor(Math.random() * num_shards).toString();
    const shard_ref = ref.collection('shards').doc(shard_id);

    shard_ref.update('count', firebase.firestore.FieldValue.increment(-1));
  }

  async function likePost(postID) {
    const userID = currentUser.uid;
    const num_shards = 5;
    const ref = db.collection('counters').doc(postID);

    //Add it to the users' liked posts and merge it
    const userRef = db.collection('users').doc(userID);
    await userRef.update(
      {
        likedPosts: firebase.firestore.FieldValue.arrayUnion(postID),
      },
      { merge: true }
    );

    // Select a shard of the counter at random
    const shard_id = Math.floor(Math.random() * num_shards).toString();
    const shard_ref = ref.collection('shards').doc(shard_id);

    // Update count
    shard_ref.update('count', firebase.firestore.FieldValue.increment(1));
  }
  function dislikePost(postID) {
    const userID = currentUser.uid;
    const num_shards = 5;
    const ref = db.collection('counters').doc(postID);

    // Select a shard of the counter at random
    const shard_id = Math.floor(Math.random() * num_shards).toString();
    const shard_ref = ref.collection('shards').doc(shard_id);

    // Update count
    shard_ref.update('count', firebase.firestore.FieldValue.increment(1));

    //Write to the shard
  }

  function sendConfirmationEmail() {
    auth
      .sendSignInLinkToEmail(user.email, actionCodeSettings)
      .then(() => {
        // The link was successfully sent. Inform the user.
        // Save the email locally so you don't need to ask the user for it again
        // if they open the link on the same device.
        window.localStorage.setItem('emailForSignIn', user.email);
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
      });
  }

  useEffect(() => {
    setLoadingUser(true);
    setLoading(true);
    let mount = true;
    if (mount === true) {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          if (user.emailVerified && user.displayName != null) {
            setCurrentUser(user);
            setLoadingUser(false);
            setLoading(false);
          }
          if (user.displayName && !user.emailVerified) {
            setNotConfirmedEmail(true);
            setLoadingUser(false);
          }
          if (user.emailVerified && user.displayName === null) {
            setCurrentUser(user);
            setLoadingUser(false);

            navigate('/setup');
          }
        } else {
          console.log('No user found');
          setLoadUser(false);
          setLoadingUser(false);
          setLoading(false);
        }
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
    likePost,
    dislikePost,
    heartPost,
    hasUserLikedPost,
    recentlyUploaded,
    removeLikePost,
    removeHeartPost,
    completeSignInWithEmail,
    setCurrentUser,
    notConfirmedEmail,
    loadingUser,
  };
  return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>;
}
