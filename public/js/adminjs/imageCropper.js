
function viewImage1(event) {
    document.getElementById("imgView1").src = URL.createObjectURL(
      event.target.files[0]
    );
  }
  
  function viewImage2(event) {
    document.getElementById("imgView2").src = URL.createObjectURL(
      event.target.files[0]
    );
  }
  
  function viewImage3(event) {
    document.getElementById("imgView3").src = URL.createObjectURL(
      event.target.files[0]
    );
  }
  
  function viewImage4(event) {
    document.getElementById("imgView4").src = URL.createObjectURL(
      event.target.files[0]
    );
  }
  
  function viewImage(event, index) {
    let input = event.target;
    let reader = new FileReader();
    reader.onload = function () {
      let dataURL = reader.result;
      let image = document.getElementById("imgView" + index);
      image.src = dataURL;
      let cropper = new Cropper(image, {
        aspectRatio: 1,
        viewMode: 1,
        guides: true,
        background: false,
        autoCropArea: 1,
        zoomable: true,
      });
      let cropperContainer = document.querySelector(
        "#croppedImg" + index
      ).parentNode;
      cropperContainer.style.display = "block";
      let saveButton = document.querySelector("#saveButton" + index);
      saveButton.addEventListener("click", async function () {
        let croppedCanvas = cropper.getCroppedCanvas();
        let croppedImage = document.getElementById("croppedImg" + index);
        croppedImage.src = croppedCanvas.toDataURL("image/jpeg", 1.0);
        let timestamp = new Date().getTime();
        let fileName = `cropped-img-${timestamp}-${index}.png`;
        await croppedCanvas.toBlob((blob) => {
          let input = document.getElementById("input" + index);
          let imgFile = new File([blob], fileName, blob);
          const fileList = new DataTransfer();
          fileList.items.add(imgFile);
          input.files = fileList.files;
        });
        cropperContainer.style.display = "none";
      });
    };
    reader.readAsDataURL(input.files[0]);
  }
  
  const selectedImages = [];
  document
    .getElementById("imageInput")
    .addEventListener("change", handleFileSelect);
  
  function handleFileSelect(event) {
    const addedImagesContainer = document.getElementById("addedImagesContainer");
    addedImagesContainer.innerHTML = "";
    const files = event.target.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      selectedImages.push(file);
      const thumbnail = document.createElement("div");
      thumbnail.classList.add("thumbnail");
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.alt = "thumbnail";
      img.style.width = "50px";
      img.style.height = "auto";
      const removeIcon = document.createElement("span");
      removeIcon.classList.add("remove-icon");
      removeIcon.innerHTML = "&times;";
      removeIcon.addEventListener("click", function () {
        const index = selectedImages.indexOf(file);
        if (index !== -1) {
          selectedImages.splice(index, 1);
        }
        thumbnail.remove();
      });
      thumbnail.appendChild(img);
      thumbnail.appendChild(removeIcon);
      addedImagesContainer.appendChild(thumbnail);
    }
  }
  