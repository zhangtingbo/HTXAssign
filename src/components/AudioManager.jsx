import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { makeStyles } from '@material-ui/core/styles';
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { getUserAccount, updateUserAccount } from '../redux/userLoginSlice';

import AudioListComp from './AudioListComp';
import { formatAudioFiles, filterByUserid } from '../common/util';
import { serverUrl,delay } from '../common/variables';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.primary.bg,
    color: theme.palette.primary.contrastText,

  },
  container:{
    width:'80%',
    height:'100px',
    margin: '0 auto',
    display:"flex",
    flexDirection: 'column',
  },
  loadercontainer:{
    display:"flex",
    justifyContent: 'space-around',
  },
  header: {
    height: '30px',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '5px'
  },
  buttongrp: {
    height: '30px',
    width: '180px',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  h3:{
    display:'block',
    fontSize:'1.5em',
    marginLeft:'10px'
  },
  username: {
    fontSize: '24px',
    paddingLeft: '20px'
  },
  inputGrp: {
    display:'flex',
    flexDirection: 'column',
    alignItems:'baseline'
  },
  buttonupload:{
    width:'120px',
    alignSelf:'center'
  }
}));

function AudioManager(props) {

  const classes = useStyles();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  let user = useSelector(getUserAccount);

  const [audioFiles, setAudioFiles] = useState({ rows: [], columns: []});
  const [updateAudioList, setUpdateAudioList] = useState(0);
  const [audioURL,setAudioURL] = useState({});

  useEffect(() => {
    // update Audio File here
    getAudioFiles();
  }, []);

  const getAudioFiles = async (url,id) => {
    console.log("Getting Audio files from service...")
    try {
      await axios.get(serverUrl + "/api/audiolist")
        .then(res => {
          const filesData = res.data.files;

          // but need to filter by userid
          try {
            let filteredFiles = filterByUserid({ filesData, userid: user.userid });
            let formatedList = formatAudioFiles(filteredFiles,audioURL);
            
            setAudioFiles(formatedList);

            setUpdateAudioList(prev => {
              return (prev + 1) % 10;
            })
          }
          catch (e) {
            console.log("Files filtering failed!")
          }
        })
    }
    catch (err) {
      console.log(err)
    }
  }

  const onDeleteAudio = async (toBeDelete, newRows) => {
    // console.log(toBeDelete, newRows)
    try {
      await axios.delete(serverUrl + "/api/audiodelete/" + toBeDelete._id)
        .then(res => {
          // but need to filter by userid
          try {
            console.log("Delete audio successed!", res)
            try {
              getAudioFiles();
              setAudioURL(prev=>{
                if(prev[toBeDelete._id])delete prev[toBeDelete._id];
                return prev;
              });
              console.log("after getAudioFiles: audioFiles:",audioFiles)
            }
            catch (e) {
              console.log("Files filtering failed!")
            }
          }
          catch (e) {
            console.log("Delete audio failed!")
          }
        })
    }
    catch (err) {
      console.log(err)
    }
  }

  const toDownload = (row) => {
    console.log("toDownload:", row)

    const params = new URLSearchParams();
    params.append('id', row._id);
    params.append('filename', row.filename);
    params.append('contentType', row.contentType);

    try {
      axios.get(serverUrl + "/api/loadaudio?" + params.toString())
        .then(async res => {
          const fileUrl = res.data.fileUrl;
          const id = res.data.id;
          // update audio list here
          console.log("loading done, get URL:",fileUrl,id)
          setAudioURL(prev=>{
            if(!prev[id])prev[id]=fileUrl;
            return prev;
          });

          getAudioFiles();
        })
    }
    catch (err) {
      console.log(err)
    }
  }


  const handleLogout = () => {
    axios.post(serverUrl + "/api/logout", {
    }).then(res => {
      console.log("Logout successful!", res);
      // reset User Accout Redux Store here, to clear it
      dispatch(updateUserAccount({ username: '', token: '', userid: '' }));
      navigate('/');
    }).catch(err => {
      console.log("Internal server error!", err);
    });
  }

  const handleManageAccount = (event) => {
    navigate('/manageaccount');
  }
  

  /**
   * Audio Uploader functions
   */
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [newFilename, setNewFilename] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const handleFileChange = (event) => {
    setMessage('');

    const selectedFile = event.target.files[0];
    setSelectedFile(selectedFile);
    // Set the new filename to the current filename by default
    setNewFilename(selectedFile.name);
  };

  const handleFilenameChange = (event) => {
    setNewFilename(event.target.value);
  };

  const handleCategoryChange = (event) => {
    setCategory(event.target.value);
  };

  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);
  };

  const handleUpload = () => {

    if(!user.userid){
      console.log("Invalid User! Please logout and login again!");
      return;
    }

    const formData = new FormData();

    formData.append('username', user.username);
    formData.append('userid', user.userid);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('newFilename', newFilename);
    formData.append('file', selectedFile);

    const config = {
      headers: { 'content-type': 'multipart/form-data' }
    }

    try {
      axios.post(serverUrl+'/api/audioupload', formData, config).then(res=>{

        setMessage('upload success！');
        setTimeout(()=>{setMessage("")},delay);
        
        setSelectedFile("");

        // update Audio Table here
        try{
          getAudioFiles();
        }
        catch(e){
          console.log(e);
        }

      }).catch(err=>{
        console.error("upload fail:",err);
        setMessage('upload fail！');
        setTimeout(()=>{setMessage("")},delay)
      });

      
    } catch (err) {
      console.error("upload fail:",err);
      setMessage('upload fail！');
      setTimeout(()=>{setMessage("")},delay)
    }
  };

  return (
    <div className={classes.root}>
      <h1>Audio Hub</h1>
      {/* <AudiofilesContext.Provider value={{ audioFiles, setAudioFiles }}> */}
        <div className={classes.header}>
          <label className={classes.h3}>{user.username}</label>
          <div className={classes.buttongrp}>
            <button onClick={handleManageAccount}>Manage Account</button>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {/* <FileUpload /> */}
        <div className={classes.container}>
          <div className={classes.loadercontainer}>
            <div className={classes.inputGrp}>
              <label htmlFor="file">Select file:</label>
              <input className={classes.input} type="file" onChange={handleFileChange} />
            </div>
            <div className={classes.inputGrp} >
              <label htmlFor="filename">Filename:</label>
              <input className={classes.input} type="text" id="filename" value={newFilename} 
                onChange={handleFilenameChange} />
            </div>
            <div className={classes.inputGrp}>
              <label htmlFor="category">Category:</label>
              <select className={classes.input} id="category" value={category} 
                onChange={handleCategoryChange}>
                <option value="">--Select category--</option>
                <option value="music">Music</option>
                <option value="podcast">Podcast</option>
                <option value="audiobook">Audiobook</option>
              </select>
            </div>
            <div className={classes.inputGrp}>
              <label htmlFor="description">Description:</label>
              <textarea className={classes.input} id="description" value={description} 
                onChange={handleDescriptionChange} />
            </div>
          </div>
          
          <div className={classes.buttonupload}>
            <button disabled={!selectedFile} onClick={handleUpload}>Upload</button>
            <p>{message}</p>
          </div>
        </div>


        <AudioListComp audioFiles={audioFiles} deleteFile={onDeleteAudio} downloadFile={toDownload} toUpdate={updateAudioList} />

      {/* </AudiofilesContext.Provider> */}
    </div>
  )
}

export default AudioManager;