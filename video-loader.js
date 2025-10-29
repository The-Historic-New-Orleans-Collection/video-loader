(function () {

  var videos = [];

  let db;

  var VideoLoader = function( elements ) {
    this.elements = elements;
    setAssetsSource( this );
  };

  function init() {
    for(const video of videos) {

      console.log( video );
      // Open transaction, get object store, and get() each video by name
      const objectStore = db.transaction('videos_os').objectStore('videos_os');
      const request = objectStore.get(video.name);
      request.addEventListener('success', () => {
        // If the result exists in the database (is not undefined)
        if(request.result) {
          // Grab the videos from IDB and display them using displayVideo()
          console.log('taking videos from IDB');
          displayVideo(request.result.video, request.result.name, request.result.src);
        } else {
          // Fetch the videos from the network
          fetchVideoFromNetwork( video );
        }
      });
    }
  }

  function fetchVideoFromNetwork( video ) {

    console.log('Fetching video from network: ', video );
    // Fetch the video using the fetch() function,
    // then expose the response body as a blob
    const videoBlob = fetch( video.src ).then( response => response.blob() );

    // Only run the next code when both promises have fulfilled
    Promise.all([videoBlob]).then( values => {
      console.log( 'BLOB:', values[0] );
      // display the video fetched from the network with displayVideo()
      displayVideo( values[0], video.name, video.src );
      // store it in the IDB using storeVideo()
      storeVideo( values[0], video.name, video.src );
    } );
  }

  function setAssetsSource( source ) {
    for ( var i = source.elements.length - 1; i >= 0; i-- ) {
      var src = source.elements[i].getAttribute( 'data-src' ),
          file = src.split('/').pop();
      videos.push( {
        src: src,
        name: file,
        type: 'mp4'
      } );
    }
  }

  // Define the storeVideo() function
  function storeVideo( videoBlob, name, src ) {
    // Open transaction, get object store; make it a readwrite so we can write to the IDB
    const objectStore = db.transaction(['videos_os'], 'readwrite').objectStore('videos_os');
    // Create a record to add to the IDB
    const record = {
      video : videoBlob,
      name : name,
      src: src
    }

    // Add the record to the IDB using add()
    const request = objectStore.add(record);

    request.addEventListener('success', () => console.log('Record addition attempt finished'));
    request.addEventListener('error', () => console.error(request.error));
  }

  function displayVideo( videoBlob, name, src ) {
    const videoURL = URL.createObjectURL( videoBlob );
    const sourceElement = document.createElement('source');
    sourceElement.src = videoURL;
    sourceElement.type = 'video/mp4';

    const videoElement = document.querySelectorAll('[data-src="'+ src +'"]');
    videoElement[0].appendChild(sourceElement);
  }

  window.VideoLoader = VideoLoader;

  window.addEventListener( 'load', function( event ) {

    var videoLoaders = document.getElementsByClassName('js-video-loader');

    if( videoLoaders.length > 0 ) {
      new VideoLoader( videoLoaders );
    }

    // Open our database; it is created if it doesn't already exist
    // (see upgradeneeded below)
    const request = window.indexedDB.open( 'videos_db', 1 );

    // error handler signifies that the database didn't open successfully
    request.addEventListener('error', () => console.error('Database failed to open'));

    // success handler signifies that the database opened successfully
    request.addEventListener('success', () => {
      console.log('Database opened successfully');

      // Store the opened database object in the db variable. This is used a lot below
      db = request.result;
      init();
    });

    // Setup the database tables if this has not already been done
    request.addEventListener('upgradeneeded', e => {

      // Grab a reference to the opened database
      const db = e.target.result;

      // Create an objectStore to store our videos in (basically like a single table)
      // including a auto-incrementing key
      const objectStore = db.createObjectStore('videos_os', { keyPath: 'name' });

      // Define what data items the objectStore will contain
      objectStore.createIndex('video', 'video', { unique: false });

      console.log('Database setup complete');
    } );


  } );

}());