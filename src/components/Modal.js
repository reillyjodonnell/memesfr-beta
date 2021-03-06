import React, { useState, useRef } from 'react';
import ReactDom from 'react-dom';
import x from '../assets/svg/x.svg';
import { useAuth } from '../contexts/auth-context';
import Loading from './loading';
import '../css-components/modal.css';
import ImageThumb from './image-thumb';

export default function Modal(props) {
  const [name, setName] = useState('Use The Memes, Luke');
  const [disabled, setDisabled] = useState(true);
  const [file, setFile] = useState('');
  const [fileType, setFileType] = useState('');
  const [uploaded, setUploaded] = useState(false);
  const [fileError, setFileError] = useState(false);
  const [titleError, setTitleError] = useState(true);

  const titleRef = useRef();
  const inputFile = useRef();

  const { uploadMeme } = useAuth();

  const [titleErrorMessage, setTitleErrorMessage] = useState('');

  const titleRegex = /(?=.*[!@#$%^&*])/;
  const checkTitleError = (e) => {
    setTitleError(false);

    if (e.target.value.match(titleRegex)) {
      setTitleError(true);
      setTitleErrorMessage("Can't have special characters'");
    }
    if (e.target.value == '') {
      setTitleError(true);
      setTitleErrorMessage('Cannot be empty');
    } else {
      setTitleErrorMessage('');
      setTitleError(false);
    }
  };

  const uploadPost = (e) => {
    e.preventDefault();
    const image = file;
    const title = titleRef.current.value;
    uploadMeme(image, title, fileType);
    setUploaded(true);
    props.createPostFunction(false);
    props.openFilePrompt();
  };

  function removeFile() {
    setFileError('');
    setFile('');
  }

  const handleUpload = (event) => {
    setFile(event.target.files[0]);
  };
  const onButtonClick = () => {
    // `current` points to the mounted file input element
    inputFile.current.click();
  };

  return ReactDom.createPortal(
    <div className="expanded-file">
      {uploaded ? (
        <Loading />
      ) : (
        <>
          <div className="upper-section">
            <img
              alt="an x"
              className="upper-section-cancel"
              style={{}}
              onClick={props.openFilePrompt}
              src={x}
            />
          </div>
          <div className="upper-post-section">
            <div className="upper-post-avatar-container">
              <img className="sidebar-avatar" src={props.avatar} />
            </div>
            <input
              id="input"
              className="upper-post-section-meme-title"
              autoFocus
              placeholder="Meme title"
              ref={titleRef}
              onChange={(e) => checkTitleError(e)}
              required
              maxLength="40"
              label="Title"
              autoComplete="off"
              helperText={titleErrorMessage}
              error={props.titleError}
            ></input>
          </div>
        </>
      )}
      {file ? (
        <>
          <form className="main-section-form" onSubmit={uploadPost}>
            <div
              style={file ? { border: 'none' } : null}
              className="main-section"
            >
              <div className="image-preview">
                {file && (
                  <ImageThumb
                    setFileType={setFileType}
                    setFile={setFile}
                    removeFile={removeFile}
                    setFileError={setFileError}
                    className="meme-image-preview"
                    file={file}
                  ></ImageThumb>
                )}
                <input
                  accept=".png, .jpeg, .jpg, .gif, .mp4, .avi"
                  type="image"
                  style={{ display: 'none' }}
                  image={file}
                />
              </div>
            </div>
            <div className="lower-section">
              <span>
                By clicking upload you agree to abide by our Community Policy.
              </span>
              <button
                className={
                  titleError
                    ? 'modal-upload-button-disabled'
                    : 'modal-upload-button'
                }
                type="submit"
                disabled={titleError}
                onClick={props.onButtonClick}
              >
                <input
                  type="submit"
                  id="file"
                  ref={inputFile}
                  style={{ display: 'none' }}
                />
                Upload
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <div className="main-section">
            <input
              onChange={handleUpload}
              type="file"
              id="file"
              ref={inputFile}
              style={{
                display: 'none',
                opacity: 0,
              }}
            />
            <span onClick={onButtonClick} className="upload-meme-prompt">
              Choose dank meme
            </span>

            {fileError ? (
              <span style={{ padding: '1rem', color: 'red' }}>{fileError}</span>
            ) : null}
          </div>
        </>
      )}
    </div>,
    document.getElementById('portal')
  );
}
