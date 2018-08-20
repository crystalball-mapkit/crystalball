<style scoped>
.video {
position: relative; padding-bottom: 74.88%; height: 0;
}
.video iframe {
position: absolute; top: 0; left: 0; width: 100%; height: 100%;
}
</style>

<template>
  <div class="aside-content">
    <div class="title">
      <h1>The Falls are sleeping</h1>
    </div>
    <div class="video">
      <iframe width="350" height="197" src="https://www.youtube.com/embed/oWdxY_5DHq0?rel=0&amp;start=26;autoplay=1&mute=1&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
    </div>
    <div class="caption">Echo of Water Against Rocks
      <br>Ian McCluskey &amp; Steve Mital</div>
    <br>

        <Accordion :open="false">
          <h3 slot="header">legends</h3>
          <div class="flex">
              Looking out over The Long Narrows is Tsagaglalal, "She Who Watches." Her legend is told by the Wishram people:<br><br><em>A woman had a house where the village of Nixluidix was later built. She was chief of all who lived in the region. That was a long time before Coyote came up the river and changed things and people were not yet real people.  After a time Coyote in his travels came to this place and asked the inhabitants if they were living well or ill. They sent him to their chief who lived up on the rocks, where she could look down on the village and know what was going on.<br><br>Coyote climbed up to the house on the rocks and asked "What kind of living do you give these people? Do you treat them well or are you one of those evil women?" "I am teaching them to live well and build good houses," she said.<br><br>"Soon the world will change," said Coyote, "and women will no longer be chiefs." Then he changed her into a rock with the command, "You shall stay here and watch over the people who live here."<br><br>All the people know that Tsagaglalal sees all things, for whenever they are looking at her those large eyes are watching them.</em><br><br>
              <img src="images/Tsagaglalal.png" class="fullwidth">
            </div>
        </Accordion>

      <p>On May 10, 1957, in the name of progress and for the needs of the Cold War aluminum industry, the gates of The Dalles Dam were closed and in the space of just a few hours, the rapids that had roared through The Long Narrows since time immemorial were covered by the rising waters. An era was brought to a close. Anyone who possibly can should go one day to the place that used to be called Celilo Falls, and listen to the silence that hangs over what is now a reservoir.</p>

      <p>Celilo Falls was the oldest continuously inhabited place in North America. Held sacred by the tribes of the Lower Columbia, and frequented by Native Americans from throughout the Basin. It was an epicenter of culture and trade, the site of the First Salmon ceremony.....</p>

      <br>
      <Accordion>
        <h3 slot="header">sources</h3>
      <p>For a full-spectrum investigation of the civilizational transformations leading up to and beyond climate change, see <a href="https://www.anthropocene-curriculum.org" target="blank">The Anthropocene Curriculum</a>, with which "Learning from Cascadia" is affiliated.</p>
      <p>Data sources for this page include:</p>
      <p>-- <a href="" target="_blank"></a></p>
      <p>-- <a href="" target="_blank"></a></p>
      <p>-- <a href="" target="_blank"></a></p>
      <p>-- <a href="" target="_blank"></a></p>
      <p>-- <a href="" target="__blank"></a></p>
      <p>-- <a href="" target="_blank"></a></p>
      <p>-- <a href="" target="_blank"></a></p>
      <p>-- <a href="" target="_blank"></a></p>
      <br>
      </Accordion>

  </div>
  </template>
  <style scoped>
  .flex {
    display: flex;
    flex-direction: column;
  }
  .flex div {
    display: flex;
    align-items: center;
    margin-bottom: 0.5em;
  }
  .flex img {
    margin-right: 0.5em;
  }
  </style>
<script>
import AppLightBox from '../../components/AppLightBox.vue'
import Accordion from '../../components/Accordion.vue'

export default {
  name: 'WatershedDams',
  components: {
    Accordion,
    AppLightBox
  },
  data: function () {
    return {
      megaImages: [
        {
          src: 'images/CascadiaMegaregionFullsize.jpg'
        }
      ]
    }
  }
}
</script>
